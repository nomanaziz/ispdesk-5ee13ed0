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
  const e = new TextEncoder().encode(word);
  const lb = encodeLength(e.length);
  const o = new Uint8Array(lb.length + e.length);
  o.set(lb); o.set(e, lb.length); return o;
}
async function writeAll(c: Deno.TcpConn, d: Uint8Array) {
  let w = 0; while (w < d.length) { const n = await c.write(d.subarray(w)); if (n === 0) throw new Error("closed"); w += n; }
}
async function writeSentence(c: Deno.TcpConn, words: string[]) {
  const parts: Uint8Array[] = []; for (const w of words) parts.push(encodeWord(w)); parts.push(new Uint8Array([0]));
  let t = 0; for (const p of parts) t += p.length;
  const b = new Uint8Array(t); let o = 0; for (const p of parts) { b.set(p, o); o += p.length; }
  await writeAll(c, b);
}
async function readByte(c: Deno.TcpConn): Promise<number> {
  const b = new Uint8Array(1); const n = await c.read(b); if (!n) throw new Error("closed"); return b[0];
}
async function readBytes(c: Deno.TcpConn, n: number): Promise<Uint8Array> {
  const b = new Uint8Array(n); let o = 0; while (o < n) { const r = await c.read(b.subarray(o)); if (!r) throw new Error("closed"); o += r; } return b;
}
async function readLength(c: Deno.TcpConn): Promise<number> {
  const b = await readByte(c);
  if ((b & 0x80) === 0) return b;
  if ((b & 0xc0) === 0x80) { const b2 = await readByte(c); return ((b & 0x3f) << 8) | b2; }
  if ((b & 0xe0) === 0xc0) { const r = await readBytes(c, 2); return ((b & 0x1f) << 16) | (r[0] << 8) | r[1]; }
  if ((b & 0xf0) === 0xe0) { const r = await readBytes(c, 3); return ((b & 0x0f) << 24) | (r[0] << 16) | (r[1] << 8) | r[2]; }
  const r = await readBytes(c, 4); return (r[0] << 24) | (r[1] << 16) | (r[2] << 8) | r[3];
}
async function readWord(c: Deno.TcpConn): Promise<string> {
  const l = await readLength(c); if (l === 0) return ""; return new TextDecoder().decode(await readBytes(c, l));
}
async function readSentence(c: Deno.TcpConn): Promise<string[]> {
  const ws: string[] = []; while (true) { const w = await readWord(c); if (w === "") break; ws.push(w); } return ws;
}
function parseAttrs(ws: string[]): Record<string, string> {
  const a: Record<string, string> = {}; for (const w of ws) { if (w.startsWith("=")) { const i = w.indexOf("=", 1); if (i !== -1) a[w.substring(1, i)] = w.substring(i + 1); } } return a;
}
async function login(c: Deno.TcpConn, u: string, p: string) {
  await writeSentence(c, ["/login", `=name=${u}`, `=password=${p}`]);
  const r = await readSentence(c);
  if (r[0] === "!trap") throw new Error(`login: ${parseAttrs(r).message}`);
  if (r[0] !== "!done") throw new Error(`login bad: ${r.join(",")}`);
}
async function command(c: Deno.TcpConn, cmd: string, params?: Record<string, string>): Promise<Record<string, string>[]> {
  const ws = [cmd];
  if (params) for (const [k, v] of Object.entries(params)) ws.push(k.startsWith("?") ? `${k}=${v}` : `=${k}=${v}`);
  await writeSentence(c, ws);
  const out: Record<string, string>[] = [];
  while (true) {
    const s = await readSentence(c);
    if (s.length === 0) continue;
    if (s[0] === "!re") out.push(parseAttrs(s));
    else if (s[0] === "!done") break;
    else if (s[0] === "!trap") throw new Error(`cmd: ${parseAttrs(s).message}`);
  }
  return out;
}

function monthStart(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: devices } = await supabase.from("mikrotik_devices").select("*").eq("enabled", true);
    if (!devices?.length) {
      return new Response(JSON.stringify({ success: false, message: "no devices" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allClients } = await supabase
      .from("clients").select("id, username, mikrotik_id").not("username", "is", null);

    const clientMap = new Map<string, { id: string; mikrotik_id: string | null }>();
    for (const c of allClients || []) if (c.username) clientMap.set(c.username.toLowerCase(), { id: c.id, mikrotik_id: c.mikrotik_id });

    let updated = 0;
    const errors: string[] = [];
    const month = monthStart();

    for (const device of devices) {
      let conn: Deno.TcpConn | null = null;
      try {
        conn = await Deno.connect({ hostname: device.ip_address, port: device.api_port || 8728 });
        await login(conn, device.username || "admin", device.password_encrypted || "");

        const active = await command(conn, "/ppp/active/print");
        const ifaces = await command(conn, "/interface/print", { stats: "" });
        conn.close();

        if (!active.length) continue;

        // Build name → iface stats map
        const ifaceByName = new Map<string, Record<string, string>>();
        for (const i of ifaces) if (i.name) ifaceByName.set(i.name, i);

        const trafficLogs: any[] = [];

        for (const session of active) {
          const username = session.name;
          if (!username) continue;
          const ci = clientMap.get(username.toLowerCase());
          if (!ci) continue;

          // Find matching interface
          const candidates = [
            session["interface"],
            session["service"] ? `<${session["service"]}-${username}>` : null,
            `<pppoe-${username}>`,
          ].filter(Boolean) as string[];

          let iface: Record<string, string> | undefined;
          for (const cand of candidates) {
            iface = ifaceByName.get(cand);
            if (iface) break;
          }
          if (!iface) {
            for (const [n, v] of ifaceByName) {
              if (n.toLowerCase().includes(username.toLowerCase())) { iface = v; break; }
            }
          }
          if (!iface) continue;

          // MikroTik perspective: rx-byte = into router = client UPLOAD; tx-byte = out of router = client DOWNLOAD
          const upload = parseInt(iface["rx-byte"] || "0", 10);
          const download = parseInt(iface["tx-byte"] || "0", 10);

          trafficLogs.push({
            client_id: ci.id,
            username,
            device_id: device.id,
            upload_bytes: upload,
            download_bytes: download,
          });

          // Overwrite cumulative on client row (session-absolute counter)
          await supabase.from("clients").update({
            total_upload: upload,
            total_download: download,
            is_online: true,
          }).eq("id", ci.id);

          // Monthly aggregation: store latest snapshot for the month
          const { data: existing } = await supabase
            .from("client_traffic_monthly")
            .select("id")
            .eq("client_id", ci.id)
            .eq("month", month)
            .maybeSingle();

          if (existing) {
            await supabase.from("client_traffic_monthly").update({
              total_upload: upload, total_download: download, updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await supabase.from("client_traffic_monthly").insert({
              client_id: ci.id, username, month, total_upload: upload, total_download: download,
            });
          }
          updated++;
        }

        if (trafficLogs.length) {
          await supabase.from("client_traffic_logs").insert(trafficLogs);
        }
      } catch (e) {
        try { conn?.close(); } catch (_) { /* noop */ }
        errors.push(`${device.name}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true, updated, devices: devices.length, errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("collect-client-traffic:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
