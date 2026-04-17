import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- MikroTik API protocol helpers ----------
function encodeLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  if (len < 0x4000) return new Uint8Array([((len >> 8) & 0x3f) | 0x80, len & 0xff]);
  if (len < 0x200000) return new Uint8Array([((len >> 16) & 0x1f) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
  if (len < 0x10000000) return new Uint8Array([((len >> 24) & 0x0f) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  return new Uint8Array([0xf0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
}
function encodeWord(word: string): Uint8Array {
  const enc = new TextEncoder().encode(word);
  const lb = encodeLength(enc.length);
  const out = new Uint8Array(lb.length + enc.length);
  out.set(lb); out.set(enc, lb.length);
  return out;
}
async function writeAll(conn: Deno.TcpConn, data: Uint8Array) {
  let w = 0;
  while (w < data.length) {
    const n = await conn.write(data.subarray(w));
    if (n === 0) throw new Error("write closed");
    w += n;
  }
}
async function writeSentence(conn: Deno.TcpConn, words: string[]) {
  const parts: Uint8Array[] = [];
  for (const w of words) parts.push(encodeWord(w));
  parts.push(new Uint8Array([0]));
  let total = 0;
  for (const p of parts) total += p.length;
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.length; }
  await writeAll(conn, buf);
}
async function readByte(conn: Deno.TcpConn): Promise<number> {
  const b = new Uint8Array(1);
  const n = await conn.read(b);
  if (!n) throw new Error("read closed");
  return b[0];
}
async function readBytes(conn: Deno.TcpConn, count: number): Promise<Uint8Array> {
  const b = new Uint8Array(count);
  let o = 0;
  while (o < count) {
    const n = await conn.read(b.subarray(o));
    if (!n) throw new Error("read closed");
    o += n;
  }
  return b;
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
  const ws: string[] = [];
  while (true) { const w = await readWord(conn); if (w === "") break; ws.push(w); }
  return ws;
}
function parseAttrs(words: string[]): Record<string, string> {
  const a: Record<string, string> = {};
  for (const w of words) {
    if (w.startsWith("=")) {
      const i = w.indexOf("=", 1);
      if (i !== -1) a[w.substring(1, i)] = w.substring(i + 1);
    }
  }
  return a;
}
async function login(conn: Deno.TcpConn, user: string, pass: string) {
  await writeSentence(conn, ["/login", `=name=${user}`, `=password=${pass}`]);
  const r = await readSentence(conn);
  if (r[0] === "!trap") throw new Error(`Login failed: ${parseAttrs(r).message || "auth"}`);
  if (r[0] !== "!done") throw new Error(`Unexpected login: ${r.join(",")}`);
}
async function command(conn: Deno.TcpConn, cmd: string, params?: Record<string, string>): Promise<Record<string, string>[]> {
  const words = [cmd];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k.startsWith("?")) words.push(`${k}=${v}`);
      else words.push(`=${k}=${v}`);
    }
  }
  await writeSentence(conn, words);
  const out: Record<string, string>[] = [];
  while (true) {
    const s = await readSentence(conn);
    if (s.length === 0) continue;
    if (s[0] === "!re") out.push(parseAttrs(s));
    else if (s[0] === "!done") break;
    else if (s[0] === "!trap") throw new Error(`Cmd error: ${parseAttrs(s).message || "unknown"}`);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, username, mikrotik_id")
      .eq("id", client_id)
      .maybeSingle();

    if (!client?.username) {
      return new Response(JSON.stringify({ online: false, reason: "no username" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find device. Prefer client.mikrotik_id, else iterate enabled devices.
    let devices: any[] = [];
    if (client.mikrotik_id) {
      const { data } = await supabase
        .from("mikrotik_devices")
        .select("*")
        .eq("id", client.mikrotik_id)
        .eq("enabled", true);
      devices = data || [];
    }
    if (devices.length === 0) {
      const { data } = await supabase
        .from("mikrotik_devices")
        .select("*")
        .eq("enabled", true);
      devices = data || [];
    }

    for (const device of devices) {
      let conn: Deno.TcpConn | null = null;
      try {
        conn = await Deno.connect({ hostname: device.ip_address, port: device.api_port || 8728 });
        await login(conn, device.username || "admin", device.password_encrypted || "");

        const active = await command(conn, "/ppp/active/print", { "?name": client.username });
        if (active.length === 0) {
          conn.close();
          continue; // try next device
        }
        const session = active[0];
        // Possible interface name fields
        const ifaceCandidates = [
          session["interface"],
          session["service"] ? `<${session["service"]}-${client.username}>` : null,
          `<pppoe-${client.username}>`,
        ].filter(Boolean) as string[];

        // Get all interfaces stats once and pick matching one
        const ifaces = await command(conn, "/interface/print", { stats: "" });
        let match: Record<string, string> | undefined;
        for (const cand of ifaceCandidates) {
          match = ifaces.find((i) => i.name === cand);
          if (match) break;
        }
        // Fuzzy: any interface whose name contains the username
        if (!match) {
          match = ifaces.find((i) => (i.name || "").toLowerCase().includes(client.username!.toLowerCase()));
        }

        let rx_bps = 0, tx_bps = 0, session_rx = 0, session_tx = 0;
        const ifaceName = match?.name;

        if (ifaceName) {
          // monitor-traffic once
          try {
            const mon = await command(conn, "/interface/monitor-traffic", {
              interface: ifaceName,
              once: "",
            });
            if (mon[0]) {
              rx_bps = parseInt(mon[0]["rx-bits-per-second"] || "0", 10);
              tx_bps = parseInt(mon[0]["tx-bits-per-second"] || "0", 10);
            }
          } catch (_) { /* ignore */ }

          session_rx = parseInt(match!["rx-byte"] || "0", 10);
          session_tx = parseInt(match!["tx-byte"] || "0", 10);
        }

        conn.close();

        // Mapping: MikroTik rx (into router) = client UPLOAD; tx (out of router) = client DOWNLOAD
        return new Response(JSON.stringify({
          online: true,
          interface: ifaceName || null,
          uptime: session.uptime || null,
          address: session.address || null,
          // live speed
          upload_bps: rx_bps,
          download_bps: tx_bps,
          // session cumulative
          session_upload_bytes: session_rx,
          session_download_bytes: session_tx,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        try { conn?.close(); } catch (_) { /* noop */ }
        console.error("device error", device.name, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ online: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("live-traffic-snapshot error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
