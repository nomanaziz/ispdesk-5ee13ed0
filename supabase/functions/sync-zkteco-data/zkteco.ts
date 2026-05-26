// ZKTeco binary protocol helpers (TCP, port 4370)
// Based on pyzk / node-zklib protocol notes

export const CMD = {
  CONNECT: 1000,
  EXIT: 1001,
  AUTH: 1102,
  ACK_OK: 2000,
  ACK_ERROR: 2001,
  ACK_DATA: 2002,
  ACK_UNAUTH: 2005,
  ATTLOG_RRQ: 13,
  USERTEMP_RRQ: 9,
  OPTIONS_RRQ: 11,
  PREPARE_DATA: 1500,
  DATA: 1501,
  FREE_DATA: 1502,
  READ_FILE: 1804,
} as const;

const START_TAG = new Uint8Array([0x50, 0x50, 0x82, 0x7d]);

const u16le = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
const u32le = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
const readU16LE = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const readU32LE = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

function checksum16(buf: Uint8Array): number {
  let sum = 0;
  let i = 0;
  while (i + 1 < buf.length) {
    sum += buf[i] | (buf[i + 1] << 8);
    if (sum > 0xffff) sum -= 0xffff;
    i += 2;
  }
  if (i < buf.length) {
    sum += buf[i];
    if (sum > 0xffff) sum -= 0xffff;
  }
  return (~sum) & 0xffff;
}

export function createPacket(cmd: number, sessionId: number, replyId: number, data: Uint8Array = new Uint8Array()): Uint8Array {
  const body = new Uint8Array(8 + data.length);
  body.set(u16le(cmd), 0);
  // checksum placeholder
  body.set([0, 0], 2);
  body.set(u16le(sessionId), 4);
  body.set(u16le(replyId), 6);
  body.set(data, 8);
  const cs = checksum16(body);
  body.set(u16le(cs), 2);

  const pkt = new Uint8Array(8 + body.length);
  pkt.set(START_TAG, 0);
  pkt.set(u32le(body.length), 4);
  pkt.set(body, 8);
  return pkt;
}

export interface ParsedPacket {
  command: number;
  sessionId: number;
  replyId: number;
  data: Uint8Array;
}

export function parsePacket(buf: Uint8Array): ParsedPacket | null {
  if (buf.length < 16) return null;
  return {
    command: readU16LE(buf, 8),
    sessionId: readU16LE(buf, 12),
    replyId: readU16LE(buf, 14),
    data: buf.slice(16),
  };
}

// ZKTeco CommKey hash (pyzk make_commkey)
export function makeCommKey(key: number, sessionId: number, ticks = 50): Uint8Array {
  let k = 0;
  for (let i = 0; i < 32; i++) {
    if ((key & (1 << i)) !== 0) {
      k = ((k << 1) | 1) >>> 0;
    } else {
      k = (k << 1) >>> 0;
    }
  }
  k = (k + sessionId) >>> 0;

  const b = new Uint8Array(4);
  b[0] = k & 0xff;
  b[1] = (k >>> 8) & 0xff;
  b[2] = (k >>> 16) & 0xff;
  b[3] = (k >>> 24) & 0xff;

  // XOR with 'ZKSO'
  const ZKSO = [0x5a, 0x4b, 0x53, 0x4f];
  for (let i = 0; i < 4; i++) b[i] ^= ZKSO[i];

  // HH swap then XOR with ticks per pyzk: pack(B,B,B,B, c0^B, c1^B, B, c3^B)
  // where c = [b[2], b[3], b[0], b[1]]
  const B = ticks & 0xff;
  const out = new Uint8Array(4);
  out[0] = b[2] ^ B;
  out[1] = b[3] ^ B;
  out[2] = B;
  out[3] = b[1] ^ B;
  return out;
}

// ---------- TCP I/O ----------

async function readN(conn: Deno.TcpConn, target: Uint8Array, timeoutMs: number): Promise<void> {
  let read = 0;
  const deadline = Date.now() + timeoutMs;
  while (read < target.length) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Read timeout");
    const view = target.subarray(read);
    const n = await Promise.race<number | null>([
      conn.read(view),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining)),
    ]);
    if (n === null) throw new Error("Read timeout");
    if (n === 0) throw new Error("Socket closed");
    read += n;
  }
}

export async function readPacket(conn: Deno.TcpConn, timeoutMs = 8000): Promise<ParsedPacket> {
  const head = new Uint8Array(8);
  await readN(conn, head, timeoutMs);
  const size = readU32LE(head, 4);
  if (size > 10 * 1024 * 1024) throw new Error(`Packet too large: ${size}`);
  const body = new Uint8Array(size);
  await readN(conn, body, timeoutMs);
  const full = new Uint8Array(8 + size);
  full.set(head);
  full.set(body, 8);
  const p = parsePacket(full);
  if (!p) throw new Error("Bad packet");
  return p;
}

export async function sendPacket(conn: Deno.TcpConn, pkt: Uint8Array): Promise<void> {
  let written = 0;
  while (written < pkt.length) {
    const n = await conn.write(pkt.subarray(written));
    if (n <= 0) throw new Error("Write failed");
    written += n;
  }
}

// ---------- Decoders ----------

const decoder = new TextDecoder("ascii");

export interface AttRecord {
  user_id: string;
  timestamp: string; // ISO
  status: number;
  punch: number;
}

// Decode ZK encoded timestamp (uint32 seconds)
function decodeTime(t: number): string {
  const second = t % 60;
  let v = Math.floor(t / 60);
  const minute = v % 60;
  v = Math.floor(v / 60);
  const hour = v % 24;
  v = Math.floor(v / 24);
  const day = (v % 31) + 1;
  v = Math.floor(v / 31);
  const month = (v % 12) + 1;
  const year = Math.floor(v / 12) + 2000;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  return iso;
}

export function decodeAttendance(buf: Uint8Array): AttRecord[] {
  // First 4 bytes = total size, then records.
  // Record size varies by firmware: 40 bytes (new) common.
  if (buf.length < 4) return [];
  const totalSize = readU32LE(buf, 0);
  const body = buf.slice(4, 4 + totalSize);
  const records: AttRecord[] = [];

  const recordSize = 40;
  for (let off = 0; off + recordSize <= body.length; off += recordSize) {
    // Layout (40b): uid(2) name(8 not used) ver(1) status(1) ts(4) ... user_id(9 ascii)
    // pyzk uses: uid(2), user_id 24 ascii at offset 2? Actually canonical 40-byte:
    //   uid(2) | user_id(24, ascii, padded) | status(1) | timestamp(4) | punch(1) | _reserved(8)
    const uid = readU16LE(body, off);
    const userIdRaw = body.slice(off + 2, off + 26);
    const status = body[off + 26];
    const ts = readU32LE(body, off + 27);
    const punch = body[off + 31];
    const user_id = decoder.decode(userIdRaw).replace(/\0.*$/, "").trim() || String(uid);
    if (ts === 0) continue;
    records.push({
      user_id,
      timestamp: decodeTime(ts),
      status,
      punch,
    });
  }
  return records;
}

export function parseOptionString(data: Uint8Array, key: string): string | null {
  const txt = decoder.decode(data);
  // Format: "~SerialNumber=ABC123\0"
  const m = new RegExp(`${key}=([^\\0\\r\\n]+)`).exec(txt);
  return m ? m[1].trim() : null;
}
