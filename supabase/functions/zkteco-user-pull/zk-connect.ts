// Shared ZKTeco TCP connect + auth helper used by sync/user-pull/user-push functions.
import {
  CMD,
  createPacket,
  readPacket,
  sendPacket,
  makeCommKey,
} from "./zkteco.ts";

export interface ZKSession {
  conn: Deno.TcpConn;
  sessionId: number;
  replyId: number;
  log: string[];
}

export async function zkConnect(opts: {
  host: string;
  port: number;
  commKey: number;
  timeoutMs?: number;
}): Promise<ZKSession> {
  const { host, port, commKey, timeoutMs = 8000 } = opts;
  const log: string[] = [];
  log.push(`Connecting to ${host}:${port}...`);
  const conn = await Promise.race<Deno.TcpConn>([
    Deno.connect({ hostname: host, port, transport: "tcp" }),
    new Promise<Deno.TcpConn>((_, rej) =>
      setTimeout(() => rej(new Error(`Connect timeout to ${host}:${port}`)), timeoutMs)
    ),
  ]);
  log.push(`Connected`);

  let sessionId = 0;
  let replyId = 0;

  await sendPacket(conn, createPacket(CMD.CONNECT, 0, 0));
  let resp = await readPacket(conn, 6000);
  sessionId = resp.sessionId;
  replyId = resp.replyId;
  log.push(`CONNECT cmd=${resp.command} sid=${sessionId}`);

  if (resp.command === CMD.ACK_UNAUTH) {
    log.push(`Auth required, sending CommKey`);
    const authData = makeCommKey(commKey, sessionId);
    await sendPacket(conn, createPacket(CMD.AUTH, sessionId, ++replyId, authData));
    resp = await readPacket(conn, 6000);
    log.push(`AUTH cmd=${resp.command}`);
    if (resp.command !== CMD.ACK_OK) {
      try { conn.close(); } catch { /* ignore */ }
      throw new Error(`AUTH failed: command=${resp.command} (check CommKey)`);
    }
  } else if (resp.command !== CMD.ACK_OK) {
    try { conn.close(); } catch { /* ignore */ }
    throw new Error(`CONNECT failed: command=${resp.command}`);
  }

  return { conn, sessionId, replyId, log };
}

export async function zkExit(s: ZKSession): Promise<void> {
  try {
    await sendPacket(s.conn, createPacket(CMD.EXIT, s.sessionId, ++s.replyId));
  } catch { /* ignore */ }
  try { s.conn.close(); } catch { /* ignore */ }
}

// Send a long-data request that may return either ACK_OK (small data inline) or
// PREPARE_DATA + DATA* + ACK_OK (chunked). Returns merged data buffer.
export async function zkReadLongData(s: ZKSession, cmd: number, payload: Uint8Array = new Uint8Array()): Promise<Uint8Array> {
  await sendPacket(s.conn, createPacket(cmd, s.sessionId, ++s.replyId, payload));
  let r = await readPacket(s.conn, 10000);

  if (r.command === CMD.ACK_OK || r.command === CMD.ACK_DATA) {
    return r.data;
  }
  if (r.command !== CMD.PREPARE_DATA) {
    throw new Error(`Unexpected response cmd=${r.command}`);
  }
  // Drain DATA packets until ACK_OK
  let merged = new Uint8Array();
  while (true) {
    const next = await readPacket(s.conn, 10000);
    if (next.command === CMD.DATA) {
      const m = new Uint8Array(merged.length + next.data.length);
      m.set(merged);
      m.set(next.data, merged.length);
      merged = m;
    } else if (next.command === CMD.ACK_OK) {
      break;
    } else {
      throw new Error(`Stream error cmd=${next.command}`);
    }
  }
  return merged;
}

// pyzk-style read_with_buffer: wrap target command via DATA_WRRQ, then either
// receive inline data, a PREPARE_DATA stream, or use READ_BUFFER to fetch in chunks.
// Used for user/attendance pulls on modern firmwares.
export async function zkReadWithBuffer(s: ZKSession, targetCmd: number, fct = 0, ext = 0): Promise<Uint8Array> {
  // command_string = pack('<bhii', 1, command, fct, ext) → 11 bytes
  const cs = new Uint8Array(11);
  cs[0] = 1;
  cs[1] = targetCmd & 0xff;
  cs[2] = (targetCmd >> 8) & 0xff;
  // fct (i32 LE)
  cs[3] = fct & 0xff; cs[4] = (fct >> 8) & 0xff; cs[5] = (fct >> 16) & 0xff; cs[6] = (fct >> 24) & 0xff;
  // ext (i32 LE)
  cs[7] = ext & 0xff; cs[8] = (ext >> 8) & 0xff; cs[9] = (ext >> 16) & 0xff; cs[10] = (ext >> 24) & 0xff;

  await sendPacket(s.conn, createPacket(CMD.DATA_WRRQ, s.sessionId, ++s.replyId, cs));
  let r = await readPacket(s.conn, 10000);
  s.log.push(`WRRQ resp cmd=${r.command} len=${r.data.length}`);

  // Case A: device returned data inline as CMD.DATA
  if (r.command === CMD.DATA) {
    return r.data;
  }

  // Case B: PREPARE_DATA then DATA stream
  if (r.command === CMD.PREPARE_DATA) {
    let merged = new Uint8Array();
    while (true) {
      const next = await readPacket(s.conn, 15000);
      if (next.command === CMD.DATA) {
        const m = new Uint8Array(merged.length + next.data.length);
        m.set(merged); m.set(next.data, merged.length);
        merged = m;
      } else if (next.command === CMD.ACK_OK) {
        break;
      } else {
        throw new Error(`Stream error cmd=${next.command}`);
      }
    }
    return merged;
  }

  // Case C: ACK_OK with [pad(1)][size:4][...] header → use READ_BUFFER chunks
  if (r.command === CMD.ACK_OK && r.data.length >= 5) {
    const size = r.data[1] | (r.data[2] << 8) | (r.data[3] << 16) | (r.data[4] << 24);
    s.log.push(`buffer size=${size}`);
    if (size <= 0) return new Uint8Array();

    const MAX_CHUNK = 16 * 1024;
    const out = new Uint8Array(size);
    let start = 0;
    while (start < size) {
      const want = Math.min(MAX_CHUNK, size - start);
      // command_string = pack('<ii', start, want) → 8 bytes
      const cb = new Uint8Array(8);
      cb[0] = start & 0xff; cb[1] = (start >> 8) & 0xff; cb[2] = (start >> 16) & 0xff; cb[3] = (start >> 24) & 0xff;
      cb[4] = want & 0xff; cb[5] = (want >> 8) & 0xff; cb[6] = (want >> 16) & 0xff; cb[7] = (want >> 24) & 0xff;
      await sendPacket(s.conn, createPacket(CMD.READ_BUFFER, s.sessionId, ++s.replyId, cb));

      // Expect PREPARE_DATA + DATA(s) + ACK_OK
      let chunk = new Uint8Array();
      let first = await readPacket(s.conn, 15000);
      if (first.command === CMD.DATA) {
        chunk = first.data;
      } else if (first.command === CMD.PREPARE_DATA) {
        while (true) {
          const next = await readPacket(s.conn, 15000);
          if (next.command === CMD.DATA) {
            const m = new Uint8Array(chunk.length + next.data.length);
            m.set(chunk); m.set(next.data, chunk.length);
            chunk = m;
          } else if (next.command === CMD.ACK_OK) {
            break;
          } else {
            throw new Error(`READ_BUFFER stream cmd=${next.command}`);
          }
        }
      } else {
        throw new Error(`READ_BUFFER unexpected cmd=${first.command}`);
      }

      const copyLen = Math.min(chunk.length, want);
      out.set(chunk.subarray(0, copyLen), start);
      start += copyLen;
      if (copyLen === 0) break; // safety
    }

    // FREE_DATA (best effort)
    try {
      await sendPacket(s.conn, createPacket(CMD.FREE_DATA, s.sessionId, ++s.replyId));
      await readPacket(s.conn, 5000);
    } catch { /* ignore */ }

    // Prepend a 4-byte size header so existing decoders (which read totalSize at offset 0) work
    const wrapped = new Uint8Array(4 + out.length);
    wrapped[0] = size & 0xff; wrapped[1] = (size >> 8) & 0xff; wrapped[2] = (size >> 16) & 0xff; wrapped[3] = (size >> 24) & 0xff;
    wrapped.set(out, 4);
    return wrapped;
  }

  throw new Error(`read_with_buffer: unexpected response cmd=${r.command}`);
}
