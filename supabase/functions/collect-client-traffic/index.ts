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

function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: devices, error: devErr } = await supabase
      .from("mikrotik_devices")
      .select("*")
      .eq("enabled", true);

    if (devErr || !devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No enabled MikroTik devices found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: allClients } = await supabase
      .from("clients")
      .select("id, username, mikrotik_id")
      .not("username", "is", null);

    const clientMap = new Map<string, { id: string; mikrotik_id: string | null }>();
    if (allClients) {
      for (const c of allClients) {
        if (c.username) clientMap.set(c.username, { id: c.id, mikrotik_id: c.mikrotik_id });
      }
    }

    let totalCollected = 0;
    const errors: string[] = [];
    const currentMonth = getCurrentMonthStart();

    for (const device of devices) {
      try {
        const conn = await Deno.connect({
          hostname: device.ip_address,
          port: device.api_port || 8728,
        });

        try {
          await mikrotikLogin(conn, device.username || "admin", device.password_encrypted || "");

          const activeSessions = await mikrotikCommand(conn, "/ppp/active/print");

          conn.close();

          if (activeSessions.length === 0) continue;

          const usernames = activeSessions.map((s) => s.name).filter(Boolean);
          
          const { data: lastLogs } = await supabase
            .from("client_traffic_logs")
            .select("username, upload_bytes, download_bytes, recorded_at")
            .in("username", usernames)
            .eq("device_id", device.id)
            .order("recorded_at", { ascending: false });

          const lastLogMap = new Map<string, { upload_bytes: number; download_bytes: number }>();
          if (lastLogs) {
            for (const log of lastLogs) {
              if (!lastLogMap.has(log.username!)) {
                lastLogMap.set(log.username!, {
                  upload_bytes: Number(log.upload_bytes),
                  download_bytes: Number(log.download_bytes),
                });
              }
            }
          }

          const trafficLogs: any[] = [];
          const clientUpdates: { id: string; username: string; upload_delta: number; download_delta: number }[] = [];

          for (const session of activeSessions) {
            const username = session.name;
            if (!username) continue;

            const currentUpload = parseInt(session["bytes-in"] || "0", 10);
            const currentDownload = parseInt(session["bytes-out"] || "0", 10);

            const lastReading = lastLogMap.get(username);
            let uploadDelta = currentUpload;
            let downloadDelta = currentDownload;

            if (lastReading) {
              uploadDelta = currentUpload >= lastReading.upload_bytes 
                ? currentUpload - lastReading.upload_bytes 
                : currentUpload;
              downloadDelta = currentDownload >= lastReading.download_bytes 
                ? currentDownload - lastReading.download_bytes 
                : currentDownload;
            }

            const clientInfo = clientMap.get(username);
            
            trafficLogs.push({
              client_id: clientInfo?.id || null,
              username,
              device_id: device.id,
              upload_bytes: currentUpload,
              download_bytes: currentDownload,
            });

            if (clientInfo && (uploadDelta > 0 || downloadDelta > 0)) {
              clientUpdates.push({
                id: clientInfo.id,
                username,
                upload_delta: uploadDelta,
                download_delta: downloadDelta,
              });
            }
          }

          // Batch insert traffic logs
          if (trafficLogs.length > 0) {
            const { error: insertErr } = await supabase
              .from("client_traffic_logs")
              .insert(trafficLogs);
            if (insertErr) {
              errors.push(`${device.name}: insert error - ${insertErr.message}`);
            } else {
              totalCollected += trafficLogs.length;
            }
          }

          // Update client totals + monthly aggregation
          for (const upd of clientUpdates) {
            const { data: currentClient } = await supabase
              .from("clients")
              .select("total_upload, total_download")
              .eq("id", upd.id)
              .single();

            if (currentClient) {
              await supabase
                .from("clients")
                .update({
                  total_upload: (Number(currentClient.total_upload) || 0) + upd.upload_delta,
                  total_download: (Number(currentClient.total_download) || 0) + upd.download_delta,
                })
                .eq("id", upd.id);
            }

            // Upsert monthly traffic
            const { data: existing } = await supabase
              .from("client_traffic_monthly")
              .select("id, total_upload, total_download")
              .eq("client_id", upd.id)
              .eq("month", currentMonth)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("client_traffic_monthly")
                .update({
                  total_upload: (Number(existing.total_upload) || 0) + upd.upload_delta,
                  total_download: (Number(existing.total_download) || 0) + upd.download_delta,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("client_traffic_monthly")
                .insert({
                  client_id: upd.id,
                  username: upd.username,
                  month: currentMonth,
                  total_upload: upd.upload_delta,
                  total_download: upd.download_delta,
                });
            }
          }

        } catch (cmdErr) {
          conn.close();
          errors.push(`${device.name}: ${(cmdErr as Error).message}`);
        }
      } catch (connErr) {
        errors.push(`${device.name}: connection failed - ${(connErr as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        collected: totalCollected,
        devices_processed: devices.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-client-traffic error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
