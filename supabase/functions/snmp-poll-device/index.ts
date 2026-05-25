// Edge function: load device + OID profile and dispatch a poll request.
// Real SNMP UDP walk from Deno edge is limited; the recommended path is an
// on-prem agent that fetches this OID list and POSTs back to sync-olt-data.
//
// Modes:
//   POST { device_id } → returns the resolved OID plan (agent calls this to know
//     what to query) and optionally attempts a minimal scalar GET.
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device, error: dErr } = await supabase
      .from("device_admin_managed_devices")
      .select(
        "id, name, vendor, category, ip_address, snmp_enabled, snmp_ip, snmp_port, snmp_community, snmp_version, oid_profile_id, fallback_protocol, agent_enabled, data_source_priority",
      )
      .eq("id", device_id)
      .single();
    if (dErr || !device) {
      return new Response(JSON.stringify({ error: "device not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mappings: any[] = [];
    if (device.oid_profile_id) {
      const { data } = await supabase
        .from("device_oid_mappings")
        .select("metric_key, oid, oid_type, value_transform, description")
        .eq("profile_id", device.oid_profile_id);
      mappings = data || [];
    }

    // Return plan for the agent / caller to execute
    return new Response(
      JSON.stringify({
        ok: true,
        device: {
          id: device.id,
          name: device.name,
          vendor: device.vendor,
          target_ip: device.snmp_ip || device.ip_address,
          snmp: {
            enabled: device.snmp_enabled,
            port: device.snmp_port,
            community: device.snmp_community,
            version: device.snmp_version,
          },
          fallback_protocol: device.fallback_protocol,
        },
        oids: mappings,
        instructions:
          "Agent: SNMP GET/WALK each OID, normalize via value_transform, POST result to /sync-olt-data with source='snmp' (or 'agent' if SSH fallback was used).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
