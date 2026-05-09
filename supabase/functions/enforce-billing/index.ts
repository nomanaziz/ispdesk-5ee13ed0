import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── RouterOS API Protocol helpers ──

function encodeLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  if (len < 0x4000) return new Uint8Array([((len >> 8) & 0x3f) | 0x80, len & 0xff]);
  if (len < 0x200000) return new Uint8Array([((len >> 16) & 0x1f) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
  if (len < 0x10000000) return new Uint8Array([((len >> 24) & 0x0f) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  return new Uint8Array([0xf0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
}

function encodeWord(word: string): Uint8Array {
  const encoded = new TextEncoder().encode(word);
  const lenBytes = encodeLength(encoded.length);
  const result = new Uint8Array(lenBytes.length + encoded.length);
  result.set(lenBytes);
  result.set(encoded, lenBytes.length);
  return result;
}

async function writeSentence(conn: Deno.TcpConn, words: string[]): Promise<void> {
  const parts: Uint8Array[] = words.map(encodeWord);
  parts.push(new Uint8Array([0]));
  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { buf.set(p, offset); offset += p.length; }
  let written = 0;
  while (written < buf.length) {
    const n = await conn.write(buf.subarray(written));
    if (n === 0) throw new Error("Connection closed");
    written += n;
  }
}

async function readByte(conn: Deno.TcpConn): Promise<number> {
  const buf = new Uint8Array(1);
  const n = await conn.read(buf);
  if (n === null || n === 0) throw new Error("Connection closed");
  return buf[0];
}

async function readBytes(conn: Deno.TcpConn, count: number): Promise<Uint8Array> {
  const buf = new Uint8Array(count);
  let offset = 0;
  while (offset < count) {
    const n = await conn.read(buf.subarray(offset));
    if (n === null || n === 0) throw new Error("Connection closed");
    offset += n;
  }
  return buf;
}

async function readLength(conn: Deno.TcpConn): Promise<number> {
  const b = await readByte(conn);
  if ((b & 0x80) === 0) return b;
  if ((b & 0xc0) === 0x80) { const b2 = await readByte(conn); return ((b & 0x3f) << 8) | b2; }
  if ((b & 0xe0) === 0xc0) { const r = await readBytes(conn, 2); return ((b & 0x1f) << 16) | (r[0] << 8) | r[1]; }
  if ((b & 0xf0) === 0xe0) { const r = await readBytes(conn, 3); return ((b & 0x0f) << 24) | (r[0] << 16) | (r[1] << 8) | r[2]; }
  const r = await readBytes(conn, 4); return (r[0] << 24) | (r[1] << 16) | (r[2] << 8) | r[3];
}

async function readWord(conn: Deno.TcpConn): Promise<string> {
  const len = await readLength(conn);
  if (len === 0) return "";
  return new TextDecoder().decode(await readBytes(conn, len));
}

async function readSentence(conn: Deno.TcpConn): Promise<string[]> {
  const words: string[] = [];
  while (true) { const w = await readWord(conn); if (w === "") break; words.push(w); }
  return words;
}

function parseSentenceAttrs(words: string[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const word of words) {
    if (word.startsWith("=")) {
      const eqIdx = word.indexOf("=", 1);
      if (eqIdx !== -1) attrs[word.substring(1, eqIdx)] = word.substring(eqIdx + 1);
    }
  }
  return attrs;
}

async function mikrotikLogin(conn: Deno.TcpConn, username: string, password: string): Promise<void> {
  await writeSentence(conn, ["/login", `=name=${username}`, `=password=${password}`]);
  const reply = await readSentence(conn);
  if (reply[0] === "!trap") throw new Error(`Login failed: ${parseSentenceAttrs(reply).message || "auth error"}`);
  if (reply[0] !== "!done") throw new Error(`Unexpected login response: ${reply.join(",")}`);
}

async function mikrotikCommand(conn: Deno.TcpConn, command: string, params?: Record<string, string>): Promise<Record<string, string>[]> {
  const words = [command];
  if (params) for (const [k, v] of Object.entries(params)) {
    // RouterOS query words start with "?" and must NOT be re-prefixed with "="
    if (k.startsWith("?")) words.push(`${k}=${v}`);
    else words.push(`=${k}=${v}`);
  }
  await writeSentence(conn, words);
  const results: Record<string, string>[] = [];
  while (true) {
    const sentence = await readSentence(conn);
    if (sentence.length === 0) continue;
    if (sentence[0] === "!re") results.push(parseSentenceAttrs(sentence));
    else if (sentence[0] === "!done") break;
    else if (sentence[0] === "!trap") throw new Error(`Command error: ${parseSentenceAttrs(sentence).message || "unknown"}`);
  }
  return results;
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Counters for audit log
  let totalChecked = 0;
  let totalOverdue = 0;
  let totalDisabled = 0;
  let totalSkippedPaid = 0;
  let totalSkippedNoBill = 0;
  let totalFailed = 0;
  const details: any[] = [];
  let triggeredBy = "cron";
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (body?.triggered_by) triggeredBy = String(body.triggered_by);
  } catch { /* ignore */ }

  const writeAudit = async (message: string) => {
    try {
      await supabase.from("billing_enforcement_runs").insert({
        triggered_by: triggeredBy,
        total_checked: totalChecked,
        total_overdue: totalOverdue,
        total_disabled: totalDisabled,
        total_skipped_paid: totalSkippedPaid,
        total_skipped_no_bill: totalSkippedNoBill,
        total_failed: totalFailed,
        message,
        details,
      });
    } catch (_e) { /* best-effort */ }
  };

  try {
    // 1. Read billing enforcement settings
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "billing_enforcement")
      .single();

    const settings = settingsRow?.setting_value as {
      enabled?: boolean;
      cutoff_time?: string;
      grace_days?: number;
      enforcement_day?: "same" | "next";
      disable_when_no_bill?: boolean;
    } | null;

    if (!settings?.enabled) {
      const msg = "Billing enforcement disabled";
      await writeAudit(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoffTime = settings.cutoff_time ?? "00:00";
    const enforcementDay = settings.enforcement_day ?? "same";
    const graceDays = Math.max(0, Number(settings.grace_days ?? 0));
    // Default: do NOT disable clients without a billing row (free / not-yet-generated lines).
    // Admin must explicitly opt-in via system setting.
    const disableWhenNoBill = settings.disable_when_no_bill === true;

    // 2. Calculate current time in Dhaka (UTC+6)
    const now = new Date();
    const dhakaOffset = 6 * 60 * 60 * 1000;
    const dhakaTime = new Date(now.getTime() + dhakaOffset);
    const dhakaDate = dhakaTime.getUTCDate();
    const dhakaMonth = dhakaTime.getUTCMonth() + 1;
    const dhakaYear = dhakaTime.getUTCFullYear();
    const dhakaHour = dhakaTime.getUTCHours();
    const dhakaMin = dhakaTime.getUTCMinutes();

    const [cutoffHour, cutoffMin] = cutoffTime.split(":").map(Number);
    const currentMinutes = dhakaHour * 60 + dhakaMin;
    const cutoffMinutes = cutoffHour * 60 + cutoffMin;

    if (currentMinutes < cutoffMinutes) {
      const msg = `Cutoff time not reached yet (now ${dhakaHour}:${String(dhakaMin).padStart(2,"0")}, cutoff ${cutoffTime})`;
      await writeAudit(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // billing_date threshold: account for "next-day" enforcement and grace days
    const baseOffset = enforcementDay === "next" ? 1 : 0;
    const checkDate = dhakaDate - baseOffset - graceDays;

    const todayStr = `${dhakaYear}-${String(dhakaMonth).padStart(2, "0")}-${String(dhakaDate).padStart(2, "0")}`;
    const currentMonthStr = `${dhakaYear}-${String(dhakaMonth).padStart(2, "0")}`;

    // 3. Fetch active candidates (case-insensitive on status)
    const { data: candidates, error: clientsErr } = await supabase
      .from("clients")
      .select("id, username, mikrotik_id, mikrotik_status, billing_date, name, client_id, is_vip, expire_date, branch_id, status")
      .eq("is_vip", false)
      .lte("billing_date", checkDate)
      .neq("mikrotik_status", "disabled");

    if (clientsErr) throw new Error(`Failed to query clients: ${clientsErr.message}`);

    // case-insensitive status filter
    const expiredClients = (candidates || []).filter(c => String(c.status || "").toLowerCase() === "active");
    totalChecked = expiredClients.length;

    if (expiredClients.length === 0) {
      const msg = "No active clients past billing cutoff";
      await writeAudit(msg);
      return new Response(JSON.stringify({ message: msg, total_checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check billing rows for current month
    const clientIds = expiredClients.map(c => c.id);
    const { data: billingData } = await supabase
      .from("billing")
      .select("client_id, status, due, amount, paid")
      .eq("month", currentMonthStr)
      .in("client_id", clientIds);

    const billingByClient = new Map<string, any>();
    if (billingData) {
      for (const b of billingData) billingByClient.set(b.client_id, b);
    }

    // POP info for postpaid rules
    const branchIds = Array.from(new Set(expiredClients.map(c => c.branch_id).filter(Boolean)));
    const { data: pops } = branchIds.length
      ? await supabase
          .from("branch_managers")
          .select("id, branch_id, pop_type, auto_disable_day, balance, allow_negative_balance")
          .in("branch_id", branchIds)
      : { data: [] as any[] };
    const popByBranch = new Map((pops || []).map((p: any) => [p.branch_id, p]));

    const clientsToDisable: typeof expiredClients = [];
    for (const c of expiredClients) {
      const b = billingByClient.get(c.id);
      const paid = Number(b?.paid || 0);
      const amount = Number(b?.amount || 0);
      const due = b?.due != null ? Number(b.due) : Math.max(0, amount - paid);

      // Skip if paid (due <= 0 with payment)
      if (b && paid > 0 && due <= 0) {
        totalSkippedPaid++;
        details.push({ client_id: c.client_id, name: c.name, action: "skipped_paid" });
        continue;
      }

      // No billing row for this month
      if (!b) {
        if (!disableWhenNoBill) {
          totalSkippedNoBill++;
          details.push({ client_id: c.client_id, name: c.name, action: "skipped_no_bill" });
          continue;
        }
        // fall through — treat as overdue
      }

      // Skip if expire_date is in the future
      if (c.expire_date && c.expire_date > todayStr) {
        totalSkippedPaid++;
        details.push({ client_id: c.client_id, name: c.name, action: "skipped_future_expire" });
        continue;
      }

      // Postpaid POP rule
      const pop: any = c.branch_id ? popByBranch.get(c.branch_id) : null;
      if (pop && pop.pop_type === "postpaid") {
        const disableDay = Number(pop.auto_disable_day || 10);
        if (dhakaDate < disableDay) {
          totalSkippedPaid++;
          details.push({ client_id: c.client_id, name: c.name, action: "skipped_postpaid_window" });
          continue;
        }
        if (Number(pop.balance || 0) >= 0) {
          totalSkippedPaid++;
          details.push({ client_id: c.client_id, name: c.name, action: "skipped_postpaid_balance_ok" });
          continue;
        }
      }

      totalOverdue++;
      clientsToDisable.push(c);
    }

    if (clientsToDisable.length === 0) {
      const msg = `Checked ${totalChecked}, none required disabling`;
      await writeAudit(msg);
      return new Response(JSON.stringify({
        message: msg,
        total_checked: totalChecked,
        total_skipped_paid: totalSkippedPaid,
        total_skipped_no_bill: totalSkippedNoBill,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. MikroTik servers
    const { data: servers } = await supabase
      .from("mikrotik_devices")
      .select("id, name, ip_address, api_port, username, password_encrypted, enabled")
      .eq("enabled", true);

    const serverMap = new Map((servers || []).map((s: any) => [s.id, s]));

    // Group by mikrotik_id
    const clientsByServer = new Map<string, typeof clientsToDisable>();
    const orphanClients: typeof clientsToDisable = [];
    for (const client of clientsToDisable) {
      if (!client.mikrotik_id || !serverMap.has(client.mikrotik_id)) {
        orphanClients.push(client);
        continue;
      }
      const list = clientsByServer.get(client.mikrotik_id) || [];
      list.push(client);
      clientsByServer.set(client.mikrotik_id, list);
    }

    // Orphan: no MikroTik device — mark in DB only
    for (const c of orphanClients) {
      await supabase.from("clients").update({ mikrotik_status: "disabled" }).eq("id", c.id);
      totalDisabled++;
      details.push({ client_id: c.client_id, name: c.name, action: "disabled_db_only", reason: "no mikrotik device" });
    }

    // Process each server
    for (const [serverId, clients] of clientsByServer) {
      const server: any = serverMap.get(serverId);
      let conn: Deno.TcpConn | null = null;
      try {
        conn = await Deno.connect({
          hostname: server.ip_address,
          port: server.api_port || 8728,
        });
        await mikrotikLogin(conn, server.username || "admin", server.password_encrypted || "");

        for (const client of clients) {
          try {
            const secrets = await mikrotikCommand(conn, "/ppp/secret/print", {
              "?name": client.username || "",
            });

            if (secrets.length > 0) {
              const secretId = secrets[0][".id"];
              await mikrotikCommand(conn, "/ppp/secret/set", {
                ".id": secretId,
                disabled: "yes",
              });

              try {
                const activeSessions = await mikrotikCommand(conn, "/ppp/active/print", {
                  "?name": client.username || "",
                });
                for (const session of activeSessions) {
                  await mikrotikCommand(conn, "/ppp/active/remove", { ".id": session[".id"] });
                }
              } catch { /* best-effort */ }

              await supabase.from("clients").update({ mikrotik_status: "disabled" }).eq("id", client.id);
              totalDisabled++;
              details.push({ client_id: client.client_id, name: client.name, action: "disabled", server: server.name });
            } else {
              // PPP secret not found — DO NOT mark disabled blindly
              totalFailed++;
              details.push({
                client_id: client.client_id,
                name: client.name,
                action: "failed",
                error: "PPP secret not found on MikroTik",
                server: server.name,
              });
            }
          } catch (err: any) {
            totalFailed++;
            details.push({
              client_id: client.client_id,
              name: client.name,
              action: "failed",
              error: `MikroTik API: ${err.message}`,
              server: server.name,
            });
          }
        }
      } catch (err: any) {
        // Whole-server failure — mark all as failed; do NOT blindly set disabled
        for (const client of clients) {
          totalFailed++;
          details.push({
            client_id: client.client_id,
            name: client.name,
            action: "failed",
            error: `Server connection error: ${err.message}`,
            server: server?.name,
          });
        }
      } finally {
        try { conn?.close(); } catch { /* ignore */ }
      }
    }

    const msg = `Run complete — disabled ${totalDisabled}, failed ${totalFailed}, skipped ${totalSkippedPaid + totalSkippedNoBill}`;
    await writeAudit(msg);

    return new Response(JSON.stringify({
      message: msg,
      total_checked: totalChecked,
      total_overdue: totalOverdue,
      total_disabled: totalDisabled,
      total_skipped_paid: totalSkippedPaid,
      total_skipped_no_bill: totalSkippedNoBill,
      total_failed: totalFailed,
      details,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    await writeAudit(`Error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
