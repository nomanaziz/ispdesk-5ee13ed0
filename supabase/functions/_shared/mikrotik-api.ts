// MikroTik native binary API protocol helper (RouterOS API)
// Reused by inspect-device, fetch-device-users, process-deploy-job, backup-mikrotik-device

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
  const r = new Uint8Array(lb.length + enc.length);
  r.set(lb); r.set(enc, lb.length);
  return r;
}

async function writeAll(conn: Deno.TcpConn, data: Uint8Array) {
  let w = 0;
  while (w < data.length) {
    const n = await conn.write(data.subarray(w));
    if (n === 0) throw new Error("Connection closed during write");
    w += n;
  }
}

async function writeSentence(conn: Deno.TcpConn, words: string[]) {
  const parts: Uint8Array[] = words.map(encodeWord);
  parts.push(new Uint8Array([0]));
  let total = 0;
  for (const p of parts) total += p.length;
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.length; }
  await writeAll(conn, buf);
}

async function readBytes(conn: Deno.TcpConn, count: number): Promise<Uint8Array> {
  const buf = new Uint8Array(count);
  let off = 0;
  while (off < count) {
    const n = await conn.read(buf.subarray(off));
    if (n === null || n === 0) throw new Error("Connection closed during read");
    off += n;
  }
  return buf;
}

async function readByte(conn: Deno.TcpConn): Promise<number> {
  return (await readBytes(conn, 1))[0];
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
  return new TextDecoder().decode(await readBytes(conn, len));
}

async function readSentence(conn: Deno.TcpConn): Promise<string[]> {
  const words: string[] = [];
  while (true) {
    const w = await readWord(conn);
    if (w === "") break;
    words.push(w);
  }
  return words;
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

export async function mikrotikLogin(conn: Deno.TcpConn, username: string, password: string) {
  await writeSentence(conn, ["/login", `=name=${username}`, `=password=${password}`]);
  const reply = await readSentence(conn);
  if (reply[0] === "!trap") {
    const a = parseAttrs(reply);
    throw new Error(`Login failed: ${a.message || "auth error"}`);
  }
  if (reply[0] !== "!done") throw new Error(`Unexpected login response: ${reply.join(",")}`);
}

export async function mikrotikCommand(
  conn: Deno.TcpConn,
  command: string,
  params?: Record<string, string>
): Promise<Record<string, string>[]> {
  const words = [command];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      words.push(k.startsWith("?") ? `${k}=${v}` : `=${k}=${v}`);
    }
  }
  await writeSentence(conn, words);
  const out: Record<string, string>[] = [];
  while (true) {
    const s = await readSentence(conn);
    if (s.length === 0) continue;
    if (s[0] === "!re") out.push(parseAttrs(s));
    else if (s[0] === "!done") break;
    else if (s[0] === "!trap") {
      const a = parseAttrs(s);
      throw new Error(`Command error: ${a.message || "unknown"}`);
    }
  }
  return out;
}

/** Connect + login + run commands; auto-closes connection. Returns friendly errors. */
export async function withMikrotik<T>(
  device: { ip_address: string; api_port?: number | null; username?: string | null; password_encrypted?: string | null; name?: string },
  fn: (conn: Deno.TcpConn) => Promise<T>
): Promise<T> {
  const port = device.api_port || 8728;
  const user = device.username || "admin";
  const pass = device.password_encrypted || "";
  let conn: Deno.TcpConn | null = null;
  try {
    conn = await Promise.race([
      Deno.connect({ hostname: device.ip_address, port }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Timeout connecting to ${device.ip_address}:${port}`)), 8000)),
    ]) as Deno.TcpConn;
    await mikrotikLogin(conn, user, pass);
    return await fn(conn);
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("ConnectionRefused") || msg.includes("refused")) {
      throw new Error(`Port ${port} closed/unreachable on ${device.ip_address} (API service off?)`);
    }
    if (msg.includes("Timeout") || msg.includes("timed out")) {
      throw new Error(`Timeout — device ${device.ip_address}:${port} not responding`);
    }
    if (msg.toLowerCase().includes("login")) {
      throw new Error(`Authentication failed — check username/password for ${device.name || device.ip_address}`);
    }
    throw new Error(msg);
  } finally {
    try { conn?.close(); } catch { /* ignore */ }
  }
}
