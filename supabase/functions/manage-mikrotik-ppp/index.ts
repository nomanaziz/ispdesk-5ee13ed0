import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function writeAll(conn: Deno.TcpConn, data: Uint8Array): Promise<void> {
  let written = 0;
  while (written < data.length) {
    const n = await conn.write(data.subarray(written));
    if (n === 0) throw new Error("Connection closed during write");
    written += n;
  }
}

async function writeSentence(conn: Deno.TcpConn, words: string[]): Promise<void> {
  const parts: Uint8Array[] = [];
  for (const word of words) parts.push(encodeWord(word));
  parts.push(new Uint8Array([0]));
  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { buf.set(p, offset); offset += p.length; }
  await writeAll(conn, buf);
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
    if (n === null || n === 0) throw new Error("Connection closed during read");
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
  const r = await readBytes(conn, 4);
  return (r[0] << 24) | (r[1] << 16) | (r[2] << 8) | r[3];
}

async function readWord(conn: Deno.TcpConn): Promise<string> {
  const len = await readLength(conn);
  if (len === 0) return "";
  const data = await readBytes(conn, len);
  return new TextDecoder().decode(data);
}

async function readSentence(conn: Deno.TcpConn): Promise<string[]> {
  const words: string[] = [];
  while (true) {
    const word = await readWord(conn);
    if (word === "") break;
    words.push(word);
  }
  return words;
}

function parseSentenceAttrs(words: string[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const word of words) {
    if (word.startsWith("=")) {
      const eqIdx = word.indexOf("=", 1);
      if (eqIdx !== -1) {
        attrs[word.substring(1, eqIdx)] = word.substring(eqIdx + 1);
      }
    }
  }
  return attrs;
}

function normalizeMikrotikStatus(value?: string): "enabled" | "disabled" {
  return value === "true" || value === "yes" ? "disabled" : "enabled";
}

async function getActiveSessions(conn: Deno.TcpConn, username: string) {
  // First try server-side filter (fast). If empty, fall back to full list + client-side
  // case-insensitive match — some RouterOS versions don't honor ?name on /ppp/active.
  const target = (username || "").toLowerCase();
  try {
    const filtered = await mikrotikCommand(conn, "/ppp/active/print", { "?name": username });
    if (filtered.length > 0) return filtered;
  } catch (_) { /* ignore, fall through */ }
  try {
    const all = await mikrotikCommand(conn, "/ppp/active/print");
    return all.filter((s) => (s.name || "").toLowerCase() === target);
  } catch (_) {
    return [];
  }
}

async function getLiveTraffic(conn: Deno.TcpConn, interfaceName?: string) {
  if (!interfaceName) return null;

  try {
    const traffic = await mikrotikCommand(conn, "/interface/monitor-traffic", {
      interface: interfaceName,
      once: "",
    });

    return traffic[0] || null;
  } catch {
    return null;
  }
}

async function insertClientLog(
  supabase: ReturnType<typeof createClient>,
  clientId: string | null,
  deviceName: string,
  message: string,
) {
  if (!clientId) return;
  await supabase.from("system_logs").insert({
    user_id: clientId,
    device_name: deviceName,
    log_message: message,
  });
}

function safeClose(conn: Deno.TcpConn | null | undefined) {
  try {
    conn?.close();
  } catch {
    // Ignore already-closed socket errors from RouterOS sessions.
  }
}

async function mikrotikLogin(conn: Deno.TcpConn, username: string, password: string): Promise<void> {
  await writeSentence(conn, ["/login", `=name=${username}`, `=password=${password}`]);
  const reply = await readSentence(conn);
  if (reply[0] === "!trap") {
    const attrs = parseSentenceAttrs(reply);
    throw new Error(`Login failed: ${attrs.message || "authentication error"}`);
  }
  if (reply[0] !== "!done") throw new Error(`Unexpected login response: ${reply.join(",")}`);
}

async function mikrotikCommand(conn: Deno.TcpConn, command: string, params?: Record<string, string>): Promise<Record<string, string>[]> {
  const words = [command];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k.startsWith("?")) words.push(`${k}=${v}`);
      else words.push(`=${k}=${v}`);
    }
  }
  await writeSentence(conn, words);
  const results: Record<string, string>[] = [];
  while (true) {
    const sentence = await readSentence(conn);
    if (sentence.length === 0) continue;
    if (sentence[0] === "!re") results.push(parseSentenceAttrs(sentence));
    else if (sentence[0] === "!done") break;
    else if (sentence[0] === "!trap") {
      const attrs = parseSentenceAttrs(sentence);
      throw new Error(`Command error: ${attrs.message || "unknown"}`);
    }
  }
  return results;
}

// Supported actions: update, disable, enable, remove, list-profiles
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { mikrotik_id, client_id, username, action, password, profile, remote_address, disabled } = body;

    if (!mikrotik_id || !action) {
      return new Response(
        JSON.stringify({ error: "mikrotik_id and action are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: device, error: devErr } = await supabase
      .from("mikrotik_devices")
      .select("*")
      .eq("id", mikrotik_id)
      .single();

    if (devErr || !device) {
      return new Response(
        JSON.stringify({ error: "MikroTik device not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = device.ip_address;
    const port = device.api_port || 8728;
    const apiUser = device.username || "admin";
    const apiPass = device.password_encrypted || "";

    const conn = await Deno.connect({ hostname: ip, port });

    try {
      await mikrotikLogin(conn, apiUser, apiPass);

      // Handle list-profiles action separately
      if (action === "list-profiles") {
        const profiles = await mikrotikCommand(conn, "/ppp/profile/print");
        safeClose(conn);
        return new Response(
          JSON.stringify({ success: true, profiles }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!username) {
        safeClose(conn);
        return new Response(
          JSON.stringify({ error: "username is required for this action" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }


      // Find the PPP secret by name
      const secrets = await mikrotikCommand(conn, "/ppp/secret/print", { "?name": username });
      const secret = secrets[0];

      if (!secret && action === "status") {
        safeClose(conn);
        return new Response(
          JSON.stringify({
            success: true,
            message: `PPP secret '${username}' not found`,
            mikrotik_status: "unknown",
            has_active_session: false,
            current_id: null,
            session: null,
            live_traffic: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!secret && action === "update") {
        let createPassword = password;
        let createProfile = profile;
        let createRemoteAddress = remote_address;

        if (client_id) {
          const { data: clientFallback } = await supabase
            .from("clients")
            .select("password, profile, remote_address")
            .eq("id", client_id)
            .maybeSingle();

          createPassword = createPassword || clientFallback?.password || undefined;
          createProfile = createProfile ?? clientFallback?.profile ?? undefined;
          createRemoteAddress = createRemoteAddress ?? clientFallback?.remote_address ?? undefined;
        }

        if (!createPassword) {
          safeClose(conn);
          return new Response(
            JSON.stringify({ error: `PPP secret '${username}' not found and no password was available to create it` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const createParams: Record<string, string> = {
          name: username,
          password: createPassword,
          service: "pppoe",
          disabled: disabled === true || disabled === "yes" ? "yes" : "no",
        };

        if (createProfile) createParams.profile = createProfile;
        if (createRemoteAddress) createParams["remote-address"] = createRemoteAddress;

        await mikrotikCommand(conn, "/ppp/secret/add", createParams);

        const createdStatus = createParams.disabled === "yes" ? "disabled" : "enabled";
        await insertClientLog(
          supabase,
          client_id || null,
          device.name,
          `[PPP] ${username} secret was missing, so it was created automatically`
        );

        safeClose(conn);
        return new Response(
          JSON.stringify({
            success: true,
            created: true,
            message: `PPP secret '${username}' was missing, so it was created automatically`,
            mikrotik_status: createdStatus,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!secret) {
        safeClose(conn);
        return new Response(
          JSON.stringify({ error: `PPP secret '${username}' not found` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const secretId = secret[".id"];
      let message = "";
      let mikrotikStatus: "enabled" | "disabled" | "removed" | "unknown" = normalizeMikrotikStatus(secret.disabled);

      // Helper: update client mikrotik_status in DB
      const updateClientMkStatus = async (status: string) => {
        if (client_id) {
          await supabase.from("clients").update({ mikrotik_status: status }).eq("id", client_id);
        } else {
          await supabase.from("clients").update({ mikrotik_status: status }).eq("username", username);
        }
      };

      switch (action) {
        case "update": {
          const params: Record<string, string> = { ".id": secretId };
          if (password) params.password = password;
          if (profile) params.profile = profile;
          if (remote_address !== undefined) params["remote-address"] = remote_address || "";
          if (disabled === true || disabled === "yes") { params.disabled = "yes"; mikrotikStatus = "disabled"; }
          else if (disabled === false || disabled === "no") { params.disabled = "no"; mikrotikStatus = "enabled"; }
          else { mikrotikStatus = normalizeMikrotikStatus(secret.disabled); }
          await mikrotikCommand(conn, "/ppp/secret/set", params);
          await updateClientMkStatus(mikrotikStatus);
          message = `PPP secret '${username}' updated`;
          break;
        }
        case "disable": {
          await mikrotikCommand(conn, "/ppp/secret/set", { ".id": secretId, disabled: "yes" });
          try {
            const active = await getActiveSessions(conn, username);
            if (active.length > 0) {
              for (const session of active) {
                await mikrotikCommand(conn, "/ppp/active/remove", { ".id": session[".id"] });
              }
            }
          } catch (_) { /* no active session */ }
          mikrotikStatus = "disabled";
          message = `PPP secret '${username}' disabled and disconnected`;
          await updateClientMkStatus(mikrotikStatus);
          await insertClientLog(supabase, client_id || null, device.name, `[PPP] ${username} disabled and disconnected`);
          break;
        }
        case "enable": {
          await mikrotikCommand(conn, "/ppp/secret/set", { ".id": secretId, disabled: "no" });
          mikrotikStatus = "enabled";
          message = `PPP secret '${username}' enabled`;
          await updateClientMkStatus(mikrotikStatus);
          await insertClientLog(supabase, client_id || null, device.name, `[PPP] ${username} enabled`);
          break;
        }
        case "disconnect": {
          const active = await getActiveSessions(conn, username);
          for (const session of active) {
            await mikrotikCommand(conn, "/ppp/active/remove", { ".id": session[".id"] });
          }

          mikrotikStatus = normalizeMikrotikStatus(secret.disabled);
          message = active.length > 0
            ? `PPP active session '${username}' disconnected`
            : `PPP active session '${username}' was not connected`;
          await insertClientLog(supabase, client_id || null, device.name, `[PPP] ${username} disconnected (${active.length} session)`);
          break;
        }
        case "status": {
          const active = await getActiveSessions(conn, username);
          const current = active[0] || null;
          const traffic = await getLiveTraffic(conn, current?.name || username);
          safeClose(conn);

          return new Response(
            JSON.stringify({
              success: true,
              message: active.length > 0 ? `PPP session '${username}' is online` : `PPP session '${username}' is offline`,
              mikrotik_status,
              has_active_session: active.length > 0,
              current_id: current?.address || secret["remote-address"] || null,
              session: current ? {
                id: current[".id"] || null,
                address: current.address || null,
                caller_id: current["caller-id"] || null,
                service: current.service || null,
                uptime: current.uptime || null,
                session_id: current["session-id"] || null,
                download_bytes: current["bytes-in"] || null,
                upload_bytes: current["bytes-out"] || null,
              } : null,
              live_traffic: traffic ? {
                rx_bps: traffic["rx-bits-per-second"] || null,
                tx_bps: traffic["tx-bits-per-second"] || null,
                rx_pps: traffic["rx-packets-per-second"] || null,
                tx_pps: traffic["tx-packets-per-second"] || null,
              } : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        case "ping": {
          const targetIp = body.target_ip || secret?.["remote-address"];
          if (!targetIp) {
            safeClose(conn);
            return new Response(
              JSON.stringify({ error: "No IP address available for ping" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const pingResults = await mikrotikCommand(conn, "/ping", {
            address: targetIp,
            count: "4",
          });
          safeClose(conn);
          return new Response(
            JSON.stringify({
              success: true,
              message: `Ping to ${targetIp} completed`,
              ping_results: pingResults.map((r) => ({
                host: r.host || targetIp,
                seq: r.seq || null,
                time: r.time || null,
                ttl: r.ttl || null,
                status: r.status || (r.time ? "ok" : "timeout"),
              })),
              summary: {
                sent: pingResults.length,
                received: pingResults.filter((r) => r.time && r.time !== "timeout").length,
                packet_loss: pingResults.length > 0
                  ? `${Math.round(((pingResults.length - pingResults.filter((r) => r.time && r.time !== "timeout").length) / pingResults.length) * 100)}%`
                  : "100%",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        case "remove": {
          try {
            const active = await getActiveSessions(conn, username);
            if (active.length > 0) {
              for (const session of active) {
                await mikrotikCommand(conn, "/ppp/active/remove", { ".id": session[".id"] });
              }
            }
          } catch (_) { /* no active session */ }
          await mikrotikCommand(conn, "/ppp/secret/remove", { ".id": secretId });
          mikrotikStatus = "removed";
          message = `PPP secret '${username}' removed`;
          await insertClientLog(supabase, client_id || null, device.name, `[PPP] ${username} removed`);
          break;
        }
        default:
          safeClose(conn);
          return new Response(
            JSON.stringify({ error: `Unknown action: ${action}. Use: update, disable, enable, disconnect, status, remove` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      safeClose(conn);
      return new Response(
        JSON.stringify({ success: true, message, mikrotik_status: mikrotikStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (cmdErr) {
      safeClose(conn);
      throw cmdErr;
    }
  } catch (err) {
    console.error("manage-mikrotik-ppp error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
