// Walks system-level OIDs (sysDescr, sysUpTime, ifPhysAddress, entPhysicalSerialNum)
// and updates olt_devices with parsed hardware/firmware/serial/MAC/uptime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { snmpGet, snmpWalk, formatUptime, type SnmpTarget } from "../_shared/snmp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OID = {
  sysDescr:   "1.3.6.1.2.1.1.1.0",
  sysUpTime:  "1.3.6.1.2.1.1.3.0",
  ifPhysAddr: "1.3.6.1.2.1.2.2.1.6",     // walk
  entSerial:  "1.3.6.1.2.1.47.1.1.1.1.11", // walk
  entHwRev:   "1.3.6.1.2.1.47.1.1.1.1.8",  // walk (hardware revision)
  entFwRev:   "1.3.6.1.2.1.47.1.1.1.1.9",  // walk (firmware revision)
};

function parseBrand(desc: string): { brand_model: string; firmware: string | null; hardware: string | null } {
  // Example: "BDCOM(tm) GP3600-08B Software, Version 117819\nhardware version: A"
  const fwMatch = desc.match(/Version\s+([A-Za-z0-9._\-]+)/i);
  const hwMatch = desc.match(/hardware\s*version[:\s]+([A-Za-z0-9._\-]+)/i);
  return {
    brand_model: desc.replace(/\s+/g, " ").slice(0, 200),
    firmware: fwMatch ? fwMatch[1] : null,
    hardware: hwMatch ? hwMatch[1] : null,
  };
}

function pickMac(rawList: { value: any }[]): string | null {
  for (const v of rawList) {
    const s = String(v.value || "");
    // expect "00:11:22:33:44:55" — skip all-zero
    if (/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(s) && !/^00(:00){5}$/.test(s)) {
      return s.toUpperCase();
    }
  }
  return null;
}

function pickFirstNonEmpty(rawList: { value: any }[]): string | null {
  for (const v of rawList) {
    const s = String(v.value || "").trim();
    if (s && s !== "0") return s;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { device_id } = await req.json();
    if (!device_id) throw new Error("device_id required");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: olt, error } = await sb.from("olt_devices")
      .select("id, snmp_ip, ip_address, snmp_port, snmp_community, snmp_version, snmp_enabled")
      .eq("id", device_id).maybeSingle();
    if (error || !olt) throw new Error("OLT not found");
    if (!olt.snmp_enabled) throw new Error("SNMP disabled on this OLT");
    const ip = olt.snmp_ip || olt.ip_address;
    if (!ip) throw new Error("no SNMP IP configured");

    const t: SnmpTarget = { ip, port: olt.snmp_port || 161, community: olt.snmp_community || "public", timeoutMs: 5000 };

    const scalars = await snmpGet(t, [OID.sysDescr, OID.sysUpTime]);
    const sysDescr = String(scalars.find((v) => v.oid === OID.sysDescr)?.value || "");
    const sysUpTime = Number(scalars.find((v) => v.oid === OID.sysUpTime)?.value || 0);

    const [macVbs, serialVbs, hwVbs, fwVbs] = await Promise.all([
      snmpWalk(t, OID.ifPhysAddr, 50).catch(() => []),
      snmpWalk(t, OID.entSerial, 30).catch(() => []),
      snmpWalk(t, OID.entHwRev, 30).catch(() => []),
      snmpWalk(t, OID.entFwRev, 30).catch(() => []),
    ]);

    const parsed = parseBrand(sysDescr);
    const mac = pickMac(macVbs);
    const serial = pickFirstNonEmpty(serialVbs);
    const hwFromEnt = pickFirstNonEmpty(hwVbs);
    const fwFromEnt = pickFirstNonEmpty(fwVbs);

    const update: Record<string, any> = {
      brand_model: parsed.brand_model,
      hardware_version: hwFromEnt || parsed.hardware,
      firmware_version: fwFromEnt || parsed.firmware,
      uptime: formatUptime(sysUpTime),
      snmp_last_seen: new Date().toISOString(),
      last_data_source: "snmp",
      status: "online",
    };
    if (mac) update.mac_address = mac;
    if (serial) update.serial_number = serial;

    await sb.from("olt_devices").update(update).eq("id", device_id);

    return new Response(JSON.stringify({ ok: true, applied: update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
