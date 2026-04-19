// SNMP sysName fetcher for OLT devices
// Note: Deno edge runtime doesn't support raw UDP SNMP easily.
// This implementation builds and parses SNMPv1/v2c GET packets manually using Deno.DatagramConn.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Encode an ASN.1 length
function encodeLen(len: number): number[] {
  if (len < 0x80) return [len];
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

// Encode an OID like "1.3.6.1.2.1.1.5.0"
function encodeOid(oid: string): number[] {
  const parts = oid.split(".").map(Number);
  const out: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    if (v < 0x80) {
      out.push(v);
    } else {
      const stack: number[] = [];
      stack.push(v & 0x7f);
      v >>= 7;
      while (v > 0) {
        stack.push((v & 0x7f) | 0x80);
        v >>= 7;
      }
      while (stack.length) out.push(stack.pop()!);
    }
  }
  return out;
}

function tlv(tag: number, value: number[]): number[] {
  return [tag, ...encodeLen(value.length), ...value];
}

function buildSnmpGet(community: string, oid: string, version: number, reqId: number): Uint8Array {
  const versionTlv = tlv(0x02, [version]); // 0=v1, 1=v2c
  const communityTlv = tlv(0x04, Array.from(new TextEncoder().encode(community)));

  const reqIdBytes: number[] = [];
  let r = reqId;
  if (r === 0) reqIdBytes.push(0);
  else {
    while (r > 0) { reqIdBytes.unshift(r & 0xff); r >>= 8; }
    if (reqIdBytes[0] & 0x80) reqIdBytes.unshift(0);
  }
  const reqIdTlv = tlv(0x02, reqIdBytes);
  const errorStatus = tlv(0x02, [0]);
  const errorIndex = tlv(0x02, [0]);

  const oidTlv = tlv(0x06, encodeOid(oid));
  const nullVal = tlv(0x05, []);
  const varBind = tlv(0x30, [...oidTlv, ...nullVal]);
  const varBindList = tlv(0x30, varBind);

  const pdu = tlv(0xa0, [...reqIdTlv, ...errorStatus, ...errorIndex, ...varBindList]);
  const message = tlv(0x30, [...versionTlv, ...communityTlv, ...pdu]);
  return new Uint8Array(message);
}

// Parse response, extract OCTET STRING from sysName varbind
function parseSnmpStringResponse(buf: Uint8Array): string | null {
  // Walk to the last OCTET STRING (0x04) in the message — sysName is a string
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x04) {
      const len = buf[i + 1];
      if (len > 0 && len < 128 && i + 2 + len <= buf.length) {
        const s = new TextDecoder().decode(buf.slice(i + 2, i + 2 + len));
        // Skip the community string (which is also OCTET STRING) — return the LAST one
        // We continue looping; the last match wins
        if (i > 10) return s; // sysName is well past the community
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ip, port = 161, community = "public", version = "v2c" } = await req.json();
    if (!ip) {
      return new Response(JSON.stringify({ error: "ip required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verNum = version === "v1" ? 0 : 1;
    const packet = buildSnmpGet(community, "1.3.6.1.2.1.1.5.0", verNum, Math.floor(Math.random() * 100000));

    const conn = Deno.listenDatagram({ transport: "udp", hostname: "0.0.0.0", port: 0 });
    try {
      await conn.send(packet, { transport: "udp", hostname: ip, port: Number(port) });

      const result = await Promise.race([
        conn.receive(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);

      if (!result) {
        return new Response(JSON.stringify({ error: "SNMP timeout — device unreachable or SNMP not enabled" }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [data] = result as [Uint8Array, Deno.Addr];
      const name = parseSnmpStringResponse(data);
      if (!name) {
        return new Response(JSON.stringify({ error: "Could not parse sysName from response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      try { conn.close(); } catch { /* ignore */ }
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
