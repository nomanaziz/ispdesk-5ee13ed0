import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── RouterOS API Protocol helpers ──

function encodeLength(len: number): Uint8Array {
  if (len < 0x80) {
    return new Uint8Array([len]);
  } else if (len < 0x4000) {
    return new Uint8Array([((len >> 8) & 0x3f) | 0x80, len & 0xff]);
  } else if (len < 0x200000) {
    return new Uint8Array([
      ((len >> 16) & 0x1f) | 0xc0,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  } else if (len < 0x10000000) {
    return new Uint8Array([
      ((len >> 24) & 0x0f) | 0xe0,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  } else {
    return new Uint8Array([0xf0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  }
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
  const parts: Uint8Array[] = [];
  for (const word of words) {
    parts.push(encodeWord(word));
  }
  parts.push(new Uint8Array([0]));

  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    buf.set(p, offset);
    offset += p.length;
  }
  await writeAll(conn, buf);
}

async function writeAll(conn: Deno.TcpConn, data: Uint8Array): Promise<void> {
  let written = 0;
  while (written < data.length) {
    const n = await conn.write(data.subarray(written));
    if (n === 0) throw new Error("Connection closed during write");
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
    if (n === null || n === 0) throw new Error("Connection closed during read");
    offset += n;
  }
  return buf;
}

async function readLength(conn: Deno.TcpConn): Promise<number> {
  const b = await readByte(conn);
  if ((b & 0x80) === 0) {
    return b;
  } else if ((b & 0xc0) === 0x80) {
    const b2 = await readByte(conn);
    return ((b & 0x3f) << 8) | b2;
  } else if ((b & 0xe0) === 0xc0) {
    const rest = await readBytes(conn, 2);
    return ((b & 0x1f) << 16) | (rest[0] << 8) | rest[1];
  } else if ((b & 0xf0) === 0xe0) {
    const rest = await readBytes(conn, 3);
    return ((b & 0x0f) << 24) | (rest[0] << 16) | (rest[1] << 8) | rest[2];
  } else {
    const rest = await readBytes(conn, 4);
    return (rest[0] << 24) | (rest[1] << 16) | (rest[2] << 8) | rest[3];
  }
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
        const key = word.substring(1, eqIdx);
        const value = word.substring(eqIdx + 1);
        attrs[key] = value;
      }
    }
  }
  return attrs;
}

async function mikrotikLogin(
  conn: Deno.TcpConn,
  username: string,
  password: string
): Promise<void> {
  await writeSentence(conn, ["/login", `=name=${username}`, `=password=${password}`]);
  const reply = await readSentence(conn);
  if (reply[0] === "!trap") {
    const attrs = parseSentenceAttrs(reply);
    throw new Error(`Login failed: ${attrs.message || "authentication error"}`);
  }
  if (reply[0] !== "!done") {
    throw new Error(`Unexpected login response: ${reply.join(",")}`);
  }
}

async function mikrotikCommand(
  conn: Deno.TcpConn,
  command: string,
  params?: Record<string, string>
): Promise<Record<string, string>[]> {
  const words = [command];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k.startsWith("?")) {
        words.push(`${k}=${v}`);
      } else {
        words.push(`=${k}=${v}`);
      }
    }
  }
  await writeSentence(conn, words);

  const results: Record<string, string>[] = [];
  while (true) {
    const sentence = await readSentence(conn);
    if (sentence.length === 0) continue;
    if (sentence[0] === "!re") {
      results.push(parseSentenceAttrs(sentence));
    } else if (sentence[0] === "!done") {
      break;
    } else if (sentence[0] === "!trap") {
      const attrs = parseSentenceAttrs(sentence);
      throw new Error(`Command error: ${attrs.message || "unknown"}`);
    }
  }
  return results;
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync-secrets";
    const deviceId = body.device_id || "all";

    // Fetch enabled MikroTik devices
    let devQuery = supabase
      .from("mikrotik_devices")
      .select("id, name, ip_address, api_port, username, password_encrypted, branch_id, version")
      .eq("enabled", true);

    if (deviceId !== "all") {
      devQuery = devQuery.eq("id", deviceId);
    }

    const { data: devices, error: devErr } = await devQuery;
    if (devErr) throw devErr;
    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No enabled devices found", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: active-sessions ──
    if (action === "active-sessions") {
      const allSessions: any[] = [];
      const allSecrets: Map<string, { profile: string; disabled: boolean; server_name: string }> = new Map();
      const errors: string[] = [];

      for (const device of devices) {
        let conn: Deno.TcpConn | null = null;
        try {
          const username = device.username || "admin";
          const password = device.password_encrypted || "";
          const port = device.api_port || 8728;
          const ip = device.ip_address;

          conn = await Deno.connect({ hostname: ip, port });
          await mikrotikLogin(conn, username, password);

          // Get active PPP connections + interface counters for reliable session traffic
          const activeConns = await mikrotikCommand(conn, "/ppp/active/print");
          const ifaces = await mikrotikCommand(conn, "/interface/print", { stats: "" });
          for (const ac of activeConns) {
            const username = ac.name || "";
            const ifaceCandidates = [
              ac.interface || "",
              ac.service && username ? `<${ac.service}-${username}>` : "",
              username ? `<pppoe-${username}>` : "",
              username,
            ].filter(Boolean);

            const matchedIface =
              ifaces.find((iface) => ifaceCandidates.includes(iface.name || "")) ||
              ifaces.find((iface) => (iface.name || "").toLowerCase().includes(username.toLowerCase()));

            const sessionUploadBytes = parseInt(
              matchedIface?.["rx-byte"] || ac["bytes-in"] || "0",
              10,
            );
            const sessionDownloadBytes = parseInt(
              matchedIface?.["tx-byte"] || ac["bytes-out"] || "0",
              10,
            );

            allSessions.push({
              name: username,
              address: ac.address || "",
              uptime: ac.uptime || "",
              caller_id: ac["caller-id"] || "",
              service: ac.service || "",
              encoding: ac.encoding || "",
              server_name: device.name,
              device_id: device.id,
              session_upload_bytes: Number.isFinite(sessionUploadBytes) ? sessionUploadBytes : 0,
              session_download_bytes: Number.isFinite(sessionDownloadBytes) ? sessionDownloadBytes : 0,
            });
          }

          // Get all secrets for mismatch detection
          const secrets = await mikrotikCommand(conn, "/ppp/secret/print");
          for (const s of secrets) {
            if (s.name) {
              allSecrets.set(`${s.name.toLowerCase()}::${device.id}`, {
                profile: s.profile || "",
                disabled: s.disabled === "true" || s.disabled === "yes",
                server_name: device.name,
              });
            }
          }
        } catch (err: any) {
          errors.push(`${device.name}: ${err.message}`);
        } finally {
          try { conn?.close(); } catch { /* ignore */ }
        }
      }

      // Fetch clients from DB with zone/subzone/box names — scoped to selected device(s),
      // exclude left clients, only include those whose MikroTik PPPoE secret is ENABLED.
      const deviceIds = devices.map((d: any) => d.id);
      let clientQuery = supabase
        .from("clients")
        .select(`
          id, client_id, username, name, contact, status, profile, connection_type, mikrotik_id, is_online, mikrotik_status,
          zones:zone_id(name),
          sub_zones:sub_zone_id(name),
          boxes:box_id(name)
        `)
        .neq("status", "left")
        .in("mikrotik_id", deviceIds);
      const { data: clientsRaw } = await clientQuery;

      // Filter: only clients whose MikroTik secret exists AND is enabled (not disabled in MK).
      const clients = (clientsRaw || []).filter((c: any) => {
        if (!c.username || !c.mikrotik_id) return false;
        const mk = allSecrets.get(`${c.username.toLowerCase()}::${c.mikrotik_id}`);
        return mk && !mk.disabled;
      });

      const clientMap = new Map<string, any>();
      if (clients) {
        for (const c of clients) {
          if (c.username) {
            clientMap.set(c.username.toLowerCase(), c);
          }
        }
      }

      // Enrich sessions with client data
      const enrichedSessions = allSessions.map((s) => {
        const client = clientMap.get(s.name.toLowerCase());
        return {
          ...s,
          client_id: client?.id || null,
          client_code: client?.client_id || "",
          client_name: client?.name || "",
          contact: client?.contact || "",
          zone_name: (client?.zones as any)?.name || "",
          sub_zone_name: (client?.sub_zones as any)?.name || "",
          box_name: (client?.boxes as any)?.name || "",
          connection_type: client?.connection_type || "",
          profile: client?.profile || "",
          status: client?.status || "",
        };
      });

      // Build mismatch data
      const disabledInSystem: any[] = [];
      const enabledInSystem: any[] = [];
      const profileMismatch: any[] = [];

      if (clients) {
        for (const client of clients) {
          if (!client.username || !client.mikrotik_id) continue;
          const key = `${client.username.toLowerCase()}::${client.mikrotik_id}`;
          const mkSecret = allSecrets.get(key);
          if (!mkSecret) continue;

          const clientInfo = {
            client_id: client.id,
            mikrotik_id: client.mikrotik_id,
            username: client.username,
            client_code: client.client_id,
            client_name: client.name,
            contact: client.contact || "",
            zone_name: (client.zones as any)?.name || "",
            sub_zone_name: (client.sub_zones as any)?.name || "",
            box_name: (client.boxes as any)?.name || "",
            server_name: mkSecret.server_name,
            db_profile: client.profile || "",
            mk_profile: mkSecret.profile,
            db_status: client.status,
            mk_disabled: mkSecret.disabled,
          };

          // Disabled in system but enabled in MikroTik
          if (client.status !== "active" && !mkSecret.disabled) {
            disabledInSystem.push(clientInfo);
          }

          // Active in system but disabled in MikroTik
          if (client.status === "active" && mkSecret.disabled) {
            enabledInSystem.push(clientInfo);
          }

          // Profile mismatch
          if (client.profile && mkSecret.profile && client.profile.toLowerCase() !== mkSecret.profile.toLowerCase()) {
            profileMismatch.push(clientInfo);
          }
        }
      }

      const totalClients = clients?.length || 0;
      const onlineCount = enrichedSessions.length;
      const offlineCount = totalClients - onlineCount;

      return new Response(
        JSON.stringify({
          ok: true,
          sessions: enrichedSessions,
          online_count: onlineCount,
          offline_count: offlineCount > 0 ? offlineCount : 0,
          total_clients: totalClients,
          mismatch: { disabledInSystem, enabledInSystem, profileMismatch },
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: sync-online ──
    if (action === "sync-online") {
      const allActiveUsernames: Set<string> = new Set();
      const allSecrets: Map<string, { disabled: boolean }> = new Map();
      const errors: string[] = [];

      for (const device of devices) {
        let conn: Deno.TcpConn | null = null;
        try {
          const username = device.username || "admin";
          const password = device.password_encrypted || "";
          const port = device.api_port || 8728;
          const ip = device.ip_address;

          conn = await Deno.connect({ hostname: ip, port });
          await mikrotikLogin(conn, username, password);

          // Fetch active sessions for online status
          const activeConns = await mikrotikCommand(conn, "/ppp/active/print");
          for (const ac of activeConns) {
            if (ac.name) {
              allActiveUsernames.add(ac.name.toLowerCase());
            }
          }

          // Fetch PPP secrets for enabled/disabled status
          const secrets = await mikrotikCommand(conn, "/ppp/secret/print");
          console.log(`[sync-online] Device ${device.name}: fetched ${secrets.length} secrets`);
          let disabledCount = 0;
          for (const s of secrets) {
            if (s.name) {
              const key = `${s.name.toLowerCase()}::${device.id}`;
              // MikroTik may return "true"/"yes" or not include disabled field at all (meaning enabled)
              const isDisabled = s.disabled === "true" || s.disabled === "yes";
              if (isDisabled) disabledCount++;
              allSecrets.set(key, { disabled: isDisabled });
            }
          }
          console.log(`[sync-online] Device ${device.name}: ${disabledCount} disabled, ${secrets.length - disabledCount} enabled`);
        } catch (err: any) {
          errors.push(`${device.name}: ${err.message}`);
        } finally {
          try { conn?.close(); } catch { /* ignore */ }
        }
      }

      const { data: allClients } = await supabase
        .from("clients")
        .select("id, username, is_online, mikrotik_id, mikrotik_status");

      let onlineCount = 0;
      let offlineCount = 0;
      let statusSynced = 0;

      if (allClients && allClients.length > 0) {
        const onlineIds: string[] = [];
        const offlineIds: string[] = [];
        const enableIds: string[] = [];
        const disableIds: string[] = [];

        for (const client of allClients) {
          // Online/offline sync
          const isOnline = client.username ? allActiveUsernames.has(client.username.toLowerCase()) : false;
          if (isOnline && !client.is_online) {
            onlineIds.push(client.id);
          } else if (!isOnline && client.is_online) {
            offlineIds.push(client.id);
          }
          if (isOnline) onlineCount++;
          else offlineCount++;

          // MikroTik enabled/disabled sync
          if (client.username && client.mikrotik_id) {
            const key = `${client.username.toLowerCase()}::${client.mikrotik_id}`;
            const secret = allSecrets.get(key);
            if (secret) {
              const mkStatus = secret.disabled ? "disabled" : "enabled";
              if (client.mikrotik_status !== mkStatus) {
                if (mkStatus === "enabled") enableIds.push(client.id);
                else disableIds.push(client.id);
                statusSynced++;
        }

        console.log(`[sync-online] Matched ${allSecrets.size} secrets. Online: ${onlineIds.length} new, Offline: ${offlineIds.length} new, Enable: ${enableIds.length}, Disable: ${disableIds.length}`);
            }
          }
        }

        // Batch update is_online
        for (let i = 0; i < onlineIds.length; i += 100) {
          const batch = onlineIds.slice(i, i + 100);
          await supabase.from("clients").update({ is_online: true }).in("id", batch);
        }
        for (let i = 0; i < offlineIds.length; i += 100) {
          const batch = offlineIds.slice(i, i + 100);
          await supabase.from("clients").update({ is_online: false }).in("id", batch);
        }

        // Batch update mikrotik_status
        for (let i = 0; i < enableIds.length; i += 100) {
          const batch = enableIds.slice(i, i + 100);
          await supabase.from("clients").update({ mikrotik_status: "enabled" }).in("id", batch);
        }
        for (let i = 0; i < disableIds.length; i += 100) {
          const batch = disableIds.slice(i, i + 100);
          await supabase.from("clients").update({ mikrotik_status: "disabled" }).in("id", batch);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, online: onlineCount, offline: offlineCount, status_synced: statusSynced, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: sync-secrets (default) ──

    let totalSynced = 0;
    const errors: string[] = [];

    for (const device of devices) {
      let conn: Deno.TcpConn | null = null;
      try {
        const username = device.username || "admin";
        const password = device.password_encrypted || "";
        const port = device.api_port || 8728;
        const ip = device.ip_address;

        conn = await Deno.connect({ hostname: ip, port });
        await mikrotikLogin(conn, username, password);

        const pppSecrets = await mikrotikCommand(conn, "/ppp/secret/print");

        for (const secret of pppSecrets) {
          if (!secret.name) continue;
          const isDisabled = secret.disabled === "true" || secret.disabled === "yes";
          const { error: upsertErr } = await supabase
            .from("mikrotik_clients")
            .upsert(
              {
                name: secret.name,
                password: secret.password || "",
                service: secret.service || "pppoe",
                profile: secret.profile || "",
                caller_id: secret["caller-id"] || "",
                remote_address: secret["remote-address"] || "",
                mikrotik_id: device.id,
                server_name: device.name,
                branch_id: device.branch_id,
                user_status: isDisabled ? "disabled" : "unique",
                exported: false,
              },
              { onConflict: "name,mikrotik_id", ignoreDuplicates: false }
            );

          if (!upsertErr) totalSynced++;
        }
      } catch (err: any) {
        errors.push(`${device.name}: ${err.message}`);
      } finally {
        try { conn?.close(); } catch { /* ignore */ }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, synced: totalSynced, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
