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
