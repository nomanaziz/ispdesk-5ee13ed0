// Walks ifTable (ifDescr, ifType, ifAdminStatus, ifOperStatus, ifSpeed)
// and upserts rows into olt_ports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { snmpWalk, type SnmpTarget } from "../_shared/snmp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OID = {
  ifDescr:       "1.3.6.1.2.1.2.2.1.2",
  ifType:        "1.3.6.1.2.1.2.2.1.3",
  ifSpeed:       "1.3.6.1.2.1.2.2.1.5",
  ifAdminStatus: "1.3.6.1.2.1.2.2.1.7",
  ifOperStatus:  "1.3.6.1.2.1.2.2.1.8",
};

const STATUS_MAP: Record<number, string> = { 1: "up", 2: "down", 3: "testing", 4: "unknown", 5: "dormant", 6: "not-present", 7: "lower-layer-down" };

// Classify into our 3 categories only: pon | ether-sfp | ether-rj45
// (Drop uplink/other; everything must map to one of these for OLT use.)
function classify(name: string, ifType: number, speedBps: number): string {
  const n = (name || "").toLowerCase();
  if (/epon|gpon|pon\d|xpon/.test(n)) return "pon";
  if (/loop|null|mgmt|vlan|tunnel|aggreg/.test(n)) return "skip"; // virtual — exclude
  // SFP-capable: gigabit/10G ports usually SFP on OLT
  // ifType 117 = gigabitEthernet, 6 = ethernetCsmacd (generic), 32 = frame-relay (skip)
  const mbps = speedBps / 1_000_000;
  if (ifType === 117 || mbps >= 1000) return "ether-sfp";
  if (ifType === 6) return "ether-rj45";
  return "skip";
}

function lastIndex(oid: string, base: string): string {
  return oid.startsWith(base + ".") ? oid.slice(base.length + 1) : oid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { device_id } = await req.json();
    if (!device_id) throw new Error("device_id required");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: olt } = await sb.from("olt_devices")
      .select("id, snmp_ip, ip_address, snmp_port, snmp_community, snmp_enabled")
      .eq("id", device_id).maybeSingle();
    if (!olt) throw new Error("OLT not found");
    if (!olt.snmp_enabled) throw new Error("SNMP disabled");
    const ip = olt.snmp_ip || olt.ip_address;
    if (!ip) throw new Error("no SNMP IP");

    const t: SnmpTarget = { ip, port: olt.snmp_port || 161, community: olt.snmp_community || "public", timeoutMs: 5000 };

    const [descrs, types, speeds, admins, opers] = await Promise.all([
      snmpWalk(t, OID.ifDescr, 300),
      snmpWalk(t, OID.ifType, 300),
      snmpWalk(t, OID.ifSpeed, 300),
      snmpWalk(t, OID.ifAdminStatus, 300),
      snmpWalk(t, OID.ifOperStatus, 300),
    ]);

    const byIdx = new Map<string, any>();
    for (const v of descrs) byIdx.set(lastIndex(v.oid, OID.ifDescr), { name: String(v.value) });
    for (const v of types)  { const i = lastIndex(v.oid, OID.ifType);  const r = byIdx.get(i) || {}; r.ifType = Number(v.value);  byIdx.set(i, r); }
    for (const v of speeds) { const i = lastIndex(v.oid, OID.ifSpeed); const r = byIdx.get(i) || {}; r.speed = Number(v.value);   byIdx.set(i, r); }
    for (const v of admins) { const i = lastIndex(v.oid, OID.ifAdminStatus); const r = byIdx.get(i) || {}; r.admin = STATUS_MAP[Number(v.value)] || "unknown"; byIdx.set(i, r); }
    for (const v of opers)  { const i = lastIndex(v.oid, OID.ifOperStatus);  const r = byIdx.get(i) || {}; r.oper  = STATUS_MAP[Number(v.value)] || "unknown"; byIdx.set(i, r); }

    const now = new Date().toISOString();
    const rows: any[] = [];
    let upCount = 0, downCount = 0;
    const counts = { pon: 0, "ether-sfp": 0, "ether-rj45": 0 };

    for (const [_idx, r] of byIdx.entries()) {
      if (!r.name) continue;
      const cat = classify(r.name, r.ifType || 0, r.speed || 0);
      if (cat === "skip") continue;
      counts[cat as keyof typeof counts]++;
      if (r.oper === "up") upCount++;
      else if (r.oper === "down") downCount++;
      rows.push({
        olt_id: device_id,
        port_name: r.name,
        port_type: cat,
        admin_status: r.admin || null,
        oper_status: r.oper || null,
        speed_mbps: r.speed ? Math.round(r.speed / 1_000_000) : null,
        last_seen: now,
      });
    }

    // Replace strategy: delete existing then insert (avoid stale ports)
    await sb.from("olt_ports").delete().eq("olt_id", device_id);
    if (rows.length) {
      const { error: insErr } = await sb.from("olt_ports").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, total: rows.length, up: upCount, down: downCount, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
