// Minimal SNMPv2c client (GET, GETNEXT, walk) for Deno edge runtime.
// Uses Deno.listenDatagram (UDP). Works with public-reachable SNMP targets.

// ---------- ASN.1 BER encoding ----------
function encLen(len: number): number[] {
  if (len < 0x80) return [len];
  const bytes: number[] = [];
  let n = len;
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8; }
  return [0x80 | bytes.length, ...bytes];
}

function encInt(n: number): number[] {
  const bytes: number[] = [];
  if (n === 0) return [0x02, 0x01, 0x00];
  let v = n;
  while (v > 0) { bytes.unshift(v & 0xff); v >>= 8; }
  if (bytes[0] & 0x80) bytes.unshift(0);
  return [0x02, ...encLen(bytes.length), ...bytes];
}

function encOctet(s: string): number[] {
  const b = Array.from(new TextEncoder().encode(s));
  return [0x04, ...encLen(b.length), ...b];
}

function encOid(oid: string): number[] {
  const parts = oid.split(".").map(Number);
  const out: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    if (v < 0x80) { out.push(v); continue; }
    const stack: number[] = [v & 0x7f];
    v >>= 7;
    while (v > 0) { stack.push((v & 0x7f) | 0x80); v >>= 7; }
    while (stack.length) out.push(stack.pop()!);
  }
  return [0x06, ...encLen(out.length), ...out];
}

function encNull(): number[] { return [0x05, 0x00]; }
function tlv(tag: number, content: number[]): number[] { return [tag, ...encLen(content.length), ...content]; }

function buildPacket(community: string, pduTag: number, reqId: number, oids: string[]): Uint8Array {
  const varbinds: number[] = [];
  for (const o of oids) {
    const vb = [...encOid(o), ...encNull()];
    varbinds.push(...tlv(0x30, vb));
  }
  const vbList = tlv(0x30, varbinds);
  const pdu = tlv(pduTag, [...encInt(reqId), ...encInt(0), ...encInt(0), ...vbList]);
  const msg = tlv(0x30, [...encInt(1), ...encOctet(community), ...pdu]); // v2c=1
  return new Uint8Array(msg);
}

// ---------- ASN.1 BER decoding ----------
type Tlv = { tag: number; value: Uint8Array; next: number };

function readTlv(buf: Uint8Array, pos: number): Tlv {
  const tag = buf[pos];
  let lenByte = buf[pos + 1];
  let lenSize = 1;
  let len = lenByte;
  if (lenByte & 0x80) {
    const n = lenByte & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | buf[pos + 2 + i];
    lenSize = 1 + n;
  }
  const start = pos + 1 + lenSize;
  return { tag, value: buf.slice(start, start + len), next: start + len };
}

function decodeOid(buf: Uint8Array): string {
  if (buf.length === 0) return "";
  const first = buf[0];
  const parts = [Math.floor(first / 40), first % 40];
  let acc = 0;
  for (let i = 1; i < buf.length; i++) {
    acc = (acc << 7) | (buf[i] & 0x7f);
    if (!(buf[i] & 0x80)) { parts.push(acc); acc = 0; }
  }
  return parts.join(".");
}

function decodeInt(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let v = buf[0] & 0x80 ? -1 : 0;
  for (const b of buf) v = (v << 8) | b;
  return v;
}

export type Varbind = { oid: string; type: number; value: any; raw: Uint8Array };

function decodeValue(tag: number, raw: Uint8Array): any {
  switch (tag) {
    case 0x02: // INTEGER
    case 0x41: // Counter32
    case 0x42: // Gauge32
    case 0x43: // TimeTicks
      return decodeInt(raw);
    case 0x04: // OCTET STRING
      // try utf-8 string; if any byte > 127 → hex
      if (raw.every((b) => b >= 0x20 && b < 0x7f) || raw.length === 0) return new TextDecoder().decode(raw);
      return Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join(":");
    case 0x05: // NULL
      return null;
    case 0x06: // OID
      return decodeOid(raw);
    case 0x40: // IpAddress
      return Array.from(raw).join(".");
    default:
      return Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

function parseResponse(buf: Uint8Array): { error: number; varbinds: Varbind[] } {
  const outer = readTlv(buf, 0); // SEQUENCE
  let p = 0;
  const seq = outer.value;
  const version = readTlv(seq, p); p = version.next;
  const community = readTlv(seq, p); p = community.next;
  const pdu = readTlv(seq, p);
  // PDU: reqId, errStatus, errIndex, varbindList
  let pp = 0;
  const reqId = readTlv(pdu.value, pp); pp = reqId.next;
  const errStatus = readTlv(pdu.value, pp); pp = errStatus.next;
  const errIndex = readTlv(pdu.value, pp); pp = errIndex.next;
  const vbList = readTlv(pdu.value, pp);
  const varbinds: Varbind[] = [];
  let q = 0;
  while (q < vbList.value.length) {
    const vb = readTlv(vbList.value, q); q = vb.next;
    let r = 0;
    const oidT = readTlv(vb.value, r); r = oidT.next;
    const valT = readTlv(vb.value, r);
    varbinds.push({
      oid: decodeOid(oidT.value),
      type: valT.tag,
      value: decodeValue(valT.tag, valT.value),
      raw: valT.value,
    });
  }
  return { error: decodeInt(errStatus.value), varbinds };
}

// ---------- UDP send/recv ----------
async function udpRequest(ip: string, port: number, packet: Uint8Array, timeoutMs = 5000): Promise<Uint8Array | null> {
  const conn = Deno.listenDatagram({ transport: "udp", hostname: "0.0.0.0", port: 0 });
  try {
    await conn.send(packet, { transport: "udp", hostname: ip, port });
    const result = await Promise.race([
      conn.receive(),
      new Promise<null>((res) => setTimeout(() => res(null), timeoutMs)),
    ]);
    if (!result) return null;
    return (result as [Uint8Array, Deno.Addr])[0];
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

let _reqId = Math.floor(Math.random() * 1_000_000);
const nextId = () => ++_reqId;

export type SnmpTarget = { ip: string; port?: number; community: string; timeoutMs?: number };

export async function snmpGet(t: SnmpTarget, oids: string[]): Promise<Varbind[]> {
  const pkt = buildPacket(t.community, 0xa0, nextId(), oids);
  const resp = await udpRequest(t.ip, t.port || 161, pkt, t.timeoutMs);
  if (!resp) throw new Error(`SNMP timeout (${t.ip})`);
  const { varbinds } = parseResponse(resp);
  return varbinds;
}

export async function snmpGetNext(t: SnmpTarget, oid: string): Promise<Varbind | null> {
  const pkt = buildPacket(t.community, 0xa1, nextId(), [oid]);
  const resp = await udpRequest(t.ip, t.port || 161, pkt, t.timeoutMs);
  if (!resp) return null;
  const { varbinds } = parseResponse(resp);
  return varbinds[0] || null;
}

// Walk: keep GETNEXT until OID leaves the base subtree
export async function snmpWalk(t: SnmpTarget, baseOid: string, maxEntries = 500): Promise<Varbind[]> {
  const out: Varbind[] = [];
  let cur = baseOid;
  for (let i = 0; i < maxEntries; i++) {
    const vb = await snmpGetNext(t, cur);
    if (!vb) break;
    if (!vb.oid.startsWith(baseOid + ".") && vb.oid !== baseOid) break;
    // endOfMibView (type 0x82) — stop
    if (vb.type === 0x82) break;
    out.push(vb);
    cur = vb.oid;
  }
  return out;
}

// Helper: TimeTicks → "Xd Yh Zm"
export function formatUptime(ticks: number): string {
  if (!ticks || ticks < 0) return "—";
  const totalSec = Math.floor(ticks / 100);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}
