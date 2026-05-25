// Real SNMP probe for OLT devices.
// POST { device_id } → SNMP GET sysName on the device IP/community. If response
// arrives, mark device online + stamp last_seen / snmp_last_seen. Timeout → offline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

// --- ASN.1 / SNMP helpers (same as snmp-fetch-olt-name) ---
function encodeLen(len: number): number[] {
  if (len < 0x80) return [len];
  const bytes: number[] = [];
  let n = len;
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8; }
  return [0x80 | bytes.length, ...bytes];
}
function encodeOid(oid: string): number[] {
  const parts = oid.split(".").map(Number);
  const out: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    if (v < 0x80) { out.push(v); continue; }
    const stack: number[] = [];
    stack.push(v & 0x7f); v >>= 7;
    while (v > 0) { stack.push((v & 0x7f) | 0x80); v >>= 7; }
    while (stack.length) out.push(stack.pop()!);
  }
  return out;
}
function tlv(tag: number, value: number[]): number[] {
  return [tag, ...encodeLen(value.length), ...value];
}
function buildSnmpGet(community: string, oid: string, version: number, reqId: number): Uint8Array {
  const versionTlv = tlv(0x02, [version]);
  const communityTlv = tlv(0x04, Array.from(new TextEncoder().encode(community)));
  const reqIdBytes: number[] = [];
  let r = reqId;
  if (r === 0) reqIdBytes.push(0);
  else { while (r > 0) { reqIdBytes.unshift(r & 0xff); r >>= 8; } if (reqIdBytes[0] & 0x80) reqIdBytes.unshift(0); }
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
function parseSnmpStringResponse(buf: Uint8Array): string | null {
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x04) {
      const len = buf[i + 1];
      if (len > 0 && len < 128 && i + 2 + len <= buf.length) {
        const s = new TextDecoder().decode(buf.slice(i + 2, i + 2 + len));
        if (i > 10) return s;
      }
    }
  }
  return null;
}

async function snmpProbe(ip: string, port: number, community: string, version: string, timeoutMs = 5000): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const verNum = version === "v1" ? 0 : 1;
    const packet = buildSnmpGet(community, "1.3.6.1.2.1.1.5.0", verNum, Math.floor(Math.random() * 100000));
    const conn = Deno.listenDatagram({ transport: "udp", hostname: "0.0.0.0", port: 0 });
    try {
      await conn.send(packet, { transport: "udp", hostname: ip, port });
      const result = await Promise.race([
        conn.receive(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
      if (!result) return { ok: false, error: "SNMP timeout" };
      const [data] = result as [Uint8Array, Deno.Addr];
      const name = parseSnmpStringResponse(data);
      return { ok: true, name: name || undefined };
    } finally {
      try { conn.close(); } catch { /* ignore */ }
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { device_id } = await req.json();
    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try managed_devices first, fall back to olt_devices (some OLTs were created directly)
    let target_ip: string | null = null;
    let snmp_enabled = true;
    let snmp_port = 161;
    let snmp_community = "public";
    let snmp_version = "v2c";
    let device_name = "";

    const { data: mg } = await supabase
      .from("device_admin_managed_devices")
      .select("name, ip_address, snmp_enabled, snmp_ip, snmp_port, snmp_community, snmp_version")
      .eq("id", device_id)
      .maybeSingle();

    if (mg) {
      device_name = mg.name;
      target_ip = mg.snmp_ip || mg.ip_address;
      snmp_enabled = mg.snmp_enabled ?? true;
      snmp_port = mg.snmp_port ?? 161;
      snmp_community = mg.snmp_community ?? "public";
      snmp_version = mg.snmp_version ?? "v2c";
    } else {
      const { data: olt } = await supabase
        .from("olt_devices")
        .select("name, ip_address, snmp_enabled, snmp_ip, snmp_port, snmp_community, snmp_version")
        .eq("id", device_id)
        .maybeSingle();
      if (!olt) {
        return new Response(JSON.stringify({ error: "device not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      device_name = olt.name;
      target_ip = olt.snmp_ip || olt.ip_address;
      snmp_enabled = olt.snmp_enabled ?? true;
      snmp_port = olt.snmp_port ?? 161;
      snmp_community = olt.snmp_community ?? "public";
      snmp_version = olt.snmp_version ?? "v2c";
    }

    if (!snmp_enabled) {
      return new Response(JSON.stringify({ error: "SNMP disabled for this device" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!target_ip) {
      return new Response(JSON.stringify({ error: "no IP configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const probe = await snmpProbe(target_ip, snmp_port, snmp_community, snmp_version);
    const now = new Date().toISOString();

    // Update olt_devices (the mirror or direct row)
    if (probe.ok) {
      await supabase.from("olt_devices").update({
        status: "online",
        last_seen: now,
        snmp_last_seen: now,
        last_data_source: "snmp",
        last_offline_reason: null,
      }).eq("id", device_id);
      return new Response(JSON.stringify({
        ok: true,
        status: "online",
        name: probe.name || device_name,
        msg: `Online — sysName: ${probe.name || "(no name)"}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await supabase.from("olt_devices").update({
        status: "offline",
        last_offline_reason: probe.error || "SNMP unreachable",
        last_data_source: "snmp",
      }).eq("id", device_id);
      return new Response(JSON.stringify({
        ok: false,
        status: "offline",
        error: probe.error,
        msg: `Offline — ${probe.error}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
