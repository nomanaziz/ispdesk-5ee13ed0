// Minimal FTP client for downloading files from MikroTik (binary safe)
// RouterOS FTP server runs on port 21 by default with same credentials as API

async function readLine(conn: Deno.TcpConn): Promise<string> {
  const buf = new Uint8Array(1);
  let line = "";
  while (true) {
    const n = await conn.read(buf);
    if (n === null || n === 0) break;
    const ch = String.fromCharCode(buf[0]);
    line += ch;
    if (ch === "\n") break;
  }
  return line;
}

async function readResponse(conn: Deno.TcpConn): Promise<{ code: number; text: string }> {
  // FTP responses can be multi-line; final line starts with "NNN " (no dash)
  let text = "";
  let firstCode = "";
  while (true) {
    const line = await readLine(conn);
    if (!line) break;
    text += line;
    if (!firstCode) firstCode = line.substring(0, 3);
    // single-line response: "NNN text"
    // multi-line start: "NNN-text", end: "NNN text"
    if (line.length >= 4 && /^\d{3} /.test(line) && line.substring(0, 3) === firstCode) break;
    if (line.length >= 4 && /^\d{3} /.test(line) && !text.includes(firstCode + "-")) break;
  }
  return { code: parseInt(firstCode, 10) || 0, text };
}

async function writeCmd(conn: Deno.TcpConn, cmd: string) {
  await conn.write(new TextEncoder().encode(cmd + "\r\n"));
}

async function readAll(conn: Deno.TcpConn): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(8192);
  while (true) {
    const n = await conn.read(buf);
    if (n === null || n === 0) break;
    chunks.push(buf.slice(0, n));
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/** Download a file from MikroTik via FTP. Returns binary contents. */
export async function ftpDownload(
  host: string,
  username: string,
  password: string,
  remotePath: string,
  ftpPort = 21,
  timeoutMs = 15000,
): Promise<Uint8Array> {
  let ctrl: Deno.TcpConn | null = null;
  try {
    ctrl = await Promise.race([
      Deno.connect({ hostname: host, port: ftpPort }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`FTP connect timeout (${host}:${ftpPort})`)), timeoutMs)),
    ]) as Deno.TcpConn;

    const greet = await readResponse(ctrl);
    if (greet.code >= 400) throw new Error(`FTP greeting failed: ${greet.text.trim()}`);

    await writeCmd(ctrl, `USER ${username}`);
    const userResp = await readResponse(ctrl);
    if (userResp.code >= 400 && userResp.code !== 331) throw new Error(`USER failed: ${userResp.text.trim()}`);

    await writeCmd(ctrl, `PASS ${password}`);
    const passResp = await readResponse(ctrl);
    if (passResp.code >= 400) throw new Error(`FTP login failed: ${passResp.text.trim()}`);

    // Binary mode
    await writeCmd(ctrl, "TYPE I");
    await readResponse(ctrl);

    // Passive mode
    await writeCmd(ctrl, "PASV");
    const pasvResp = await readResponse(ctrl);
    const m = pasvResp.text.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (!m) throw new Error(`PASV parse failed: ${pasvResp.text.trim()}`);
    const dataHost = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
    const dataPort = parseInt(m[5], 10) * 256 + parseInt(m[6], 10);

    const dataConn = await Promise.race([
      Deno.connect({ hostname: dataHost, port: dataPort }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("FTP data connect timeout")), timeoutMs)),
    ]) as Deno.TcpConn;

    try {
      await writeCmd(ctrl, `RETR ${remotePath}`);
      const retrResp = await readResponse(ctrl);
      if (retrResp.code >= 400) throw new Error(`RETR failed: ${retrResp.text.trim()}`);

      const data = await readAll(dataConn);

      const finalResp = await readResponse(ctrl);
      if (finalResp.code >= 400) throw new Error(`Transfer error: ${finalResp.text.trim()}`);

      return data;
    } finally {
      try { dataConn.close(); } catch { /* ignore */ }
    }
  } finally {
    if (ctrl) {
      try { await writeCmd(ctrl, "QUIT"); } catch { /* ignore */ }
      try { ctrl.close(); } catch { /* ignore */ }
    }
  }
}
