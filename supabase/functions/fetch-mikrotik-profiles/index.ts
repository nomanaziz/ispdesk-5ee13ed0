import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── RouterOS API Protocol helpers (same as fetch-mikrotik-ppp) ──

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
  if ((b & 0x80) === 0) return b;
  if ((b & 0xc0) === 0x80) { const b2 = await readByte(conn); return ((b & 0x3f) << 8) | b2; }
  if ((b & 0xe0) === 0xc0) { const rest = await readBytes(conn, 2); return ((b & 0x1f) << 16) | (rest[0] << 8) | rest[1]; }
  if ((b & 0xf0) === 0xe0) { const rest = await readBytes(conn, 3); return ((b & 0x0f) << 24) | (rest[0] << 16) | (rest[1] << 8) | rest[2]; }
  const rest = await readBytes(conn, 4);
  return (rest[0] << 24) | (rest[1] << 16) | (rest[2] << 8) | rest[3];
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

async function mikrotikCommand(conn: Deno.TcpConn, command: string): Promise<Record<string, string>[]> {
  await writeSentence(conn, [command]);
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

    const { device_id } = await req.json().catch(() => ({ device_id: "" }));
    if (!device_id) {
      return new Response(
        JSON.stringify({ error: "device_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: device, error: devErr } = await supabase
      .from("mikrotik_devices")
      .select("id, ip_address, api_port, username, password_encrypted")
      .eq("id", device_id)
      .single();

    if (devErr || !device) {
      return new Response(
        JSON.stringify({ error: "Device not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = device.ip_address;
    const port = device.api_port || 8728;
    const username = device.username || "admin";
    const password = device.password_encrypted || "";

    const conn = await Deno.connect({ hostname: ip, port });
    try {
      await mikrotikLogin(conn, username, password);
      const profiles = await mikrotikCommand(conn, "/ppp/profile/print");

      const profileNames = profiles.map((p) => ({
        name: p.name || "",
        "rate-limit": p["rate-limit"] || "",
        "local-address": p["local-address"] || "",
        "remote-address": p["remote-address"] || "",
      }));

      return new Response(
        JSON.stringify({ ok: true, profiles: profileNames }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      try { conn.close(); } catch { /* ignore */ }
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
