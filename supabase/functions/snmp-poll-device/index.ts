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
    let mgmt_port = 23;
    let device_name = "";

    const { data: mg } = await supabase
      .from("device_admin_managed_devices")
      .select("name, ip_address, port, snmp_ip")
      .eq("id", device_id)
      .maybeSingle();

    if (mg) {
      device_name = mg.name;
      target_ip = mg.snmp_ip || mg.ip_address;
      mgmt_port = mg.port ?? 23;
    } else {
      const { data: olt } = await supabase
        .from("olt_devices")
        .select("name, ip_address, port, telnet_port, snmp_ip")
        .eq("id", device_id)
        .maybeSingle();
      if (!olt) {
        return new Response(JSON.stringify({ error: "device not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      device_name = olt.name;
      target_ip = olt.snmp_ip || olt.ip_address;
      mgmt_port = olt.telnet_port ?? olt.port ?? 23;
    }

    if (!target_ip) {
      return new Response(JSON.stringify({ error: "no IP configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try device's configured mgmt port first, then common OLT mgmt ports
    const ports = Array.from(new Set([mgmt_port, 23, 22, 80, 443])).filter((p) => p > 0);
    const probe = await probeReachable(target_ip, ports);
    const now = new Date().toISOString();

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
        msg: `Online — TCP port ${probe.port} responded`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await supabase.from("olt_devices").update({
        status: "offline",
        last_offline_reason: `TCP unreachable on ${ports.join(",")}`,
        last_data_source: "snmp",
      }).eq("id", device_id);
      return new Response(JSON.stringify({
        ok: false,
        status: "offline",
        msg: `Offline — no response on ports ${ports.join(",")}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
