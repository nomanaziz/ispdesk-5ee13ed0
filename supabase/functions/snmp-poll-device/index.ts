// Reachability probe for OLT devices.
// POST { device_id } → tries a TCP connect to the device's management port (and
// a few common fallbacks). If anything responds within the timeout, the device
// is marked online. Supabase Edge Runtime does not expose UDP, so true SNMP
// polling must be done by the on-prem agent — this probe is the best
// reachability signal we can run from the cloud.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

async function tcpProbe(ip: string, port: number, timeoutMs = 3500): Promise<boolean> {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const conn = await Deno.connect({ hostname: ip, port, transport: "tcp", signal: ac.signal } as any);
      try { conn.close(); } catch { /* ignore */ }
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

async function probeReachable(ip: string, ports: number[]): Promise<{ ok: boolean; port?: number }> {
  for (const p of ports) {
    if (!p || p < 1 || p > 65535) continue;
    const ok = await tcpProbe(ip, p);
    if (ok) return { ok: true, port: p };
  }
  return { ok: false };
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
