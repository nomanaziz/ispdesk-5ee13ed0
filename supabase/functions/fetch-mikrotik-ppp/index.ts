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
  // End-of-sentence: zero-length word
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

// Parse a sentence like ["!re", "=name=user1", "=password=pass1", ...] into an object
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
      words.push(`=${k}=${v}`);
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

    // Fetch existing client usernames to exclude
    const { data: existingClients } = await supabase
      .from("clients")
      .select("username");
    const existingUsernames = new Set(
      (existingClients || [])
        .map((c: any) => c.username?.toLowerCase())
        .filter(Boolean)
    );

    let totalSynced = 0;
    const errors: string[] = [];

    for (const device of devices) {
      let conn: Deno.TcpConn | null = null;
      try {
        const username = device.username || "admin";
        const password = device.password_encrypted || "";
        const port = device.api_port || 8728;
        const ip = device.ip_address;

        // Connect via RouterOS API (raw TCP)
        conn = await Deno.connect({ hostname: ip, port });

        // Login
        await mikrotikLogin(conn, username, password);

        // Fetch PPP secrets
        const pppSecrets = await mikrotikCommand(conn, "/ppp/secret/print");

        // Filter out usernames already in clients table
        const newSecrets = pppSecrets.filter(
          (s) => !existingUsernames.has(s.name?.toLowerCase())
        );

        // Upsert into mikrotik_clients
        for (const secret of newSecrets) {
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
