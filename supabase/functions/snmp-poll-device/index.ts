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


async function pollOne(supabase: any, device_id: string) {
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
    if (!olt) return { device_id, ok: false, error: "device not found" };
    device_name = olt.name;
    target_ip = olt.snmp_ip || olt.ip_address;
    mgmt_port = olt.telnet_port ?? olt.port ?? 23;
  }

  if (!target_ip) return { device_id, ok: false, error: "no IP configured" };

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
    return { device_id, name: device_name, ok: true, status: "online", port: probe.port };
  } else {
    await supabase.from("olt_devices").update({
      status: "offline",
      last_offline_reason: `TCP unreachable on ${ports.join(",")}`,
      last_data_source: "snmp",
    }).eq("id", device_id);
    return { device_id, name: device_name, ok: false, status: "offline", probed: ports };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body = poll all */ }
    const { device_id, all } = body;

    // Single device mode
    if (device_id) {
      const result = await pollOne(supabase, device_id);
      const status = result.ok ? 200 : (result.error === "device not found" ? 404 : 200);
      return new Response(JSON.stringify(result), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll-all mode (used by cron)
    const { data: devices, error } = await supabase
      .from("olt_devices")
      .select("id")
      .or("status.is.null,status.neq.disabled");
    if (error) throw error;

    const results = [];
    // Run in small parallel batches to avoid overload
    const batchSize = 5;
    for (let i = 0; i < (devices?.length ?? 0); i += batchSize) {
      const batch = devices!.slice(i, i + batchSize);
      const r = await Promise.all(batch.map((d: any) => pollOne(supabase, d.id)));
      results.push(...r);
    }

    const online = results.filter((r) => r.ok).length;
    console.log(`[snmp-poll-device] polled ${results.length} devices, ${online} online`);

    return new Response(JSON.stringify({ ok: true, polled: results.length, online, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[snmp-poll-device] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
