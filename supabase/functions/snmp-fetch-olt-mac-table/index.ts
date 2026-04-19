// Fetches MAC↔port FDB from OLT via SNMP Bridge-MIB and stores in olt_mac_table.
// On MVP: this function accepts an optional `entries` array (pushed by an external poller / agent),
// or attempts a best-effort SNMP walk via UDP. SNMP walk over UDP from Deno edge is limited,
// so the recommended path is: an on-prem agent calls this endpoint POST with parsed entries.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MacEntry {
  mac: string;
  port: string;
  vlan?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { olt_id, entries } = body as { olt_id?: string; entries?: MacEntry[] };

    if (!olt_id) {
      return new Response(JSON.stringify({ error: "olt_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load OLT config
    const { data: olt, error: oltErr } = await supabase
      .from("olt_devices")
      .select("id, ip_address, snmp_ip, snmp_port, snmp_community, snmp_version, snmp_enabled")
      .eq("id", olt_id)
      .single();
    if (oltErr || !olt) throw new Error("OLT not found");

    // Load port classifications for this OLT (port_name -> port_type)
    const { data: portRows } = await supabase
      .from("olt_ports")
      .select("port_name, port_type")
      .eq("olt_id", olt_id);
    const portTypeMap = new Map<string, string>();
    (portRows || []).forEach((p) => portTypeMap.set(p.port_name, p.port_type));

    let macEntries: MacEntry[] = Array.isArray(entries) ? entries : [];

    // If no entries pushed, attempt minimal SNMP walk (best effort — many devices need agent)
    if (macEntries.length === 0) {
      // Placeholder: real Bridge-MIB walk would require GETBULK over UDP.
      // We surface a clear error so the user knows to install/run the agent.
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "No entries provided. Install the on-prem polling agent and POST { olt_id, entries: [{mac, port, vlan}] }.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize MAC + classify port_type
    const rows = macEntries
      .filter((e) => e.mac && e.port)
      .map((e) => ({
        olt_id,
        mac: e.mac.toLowerCase().replace(/[^a-f0-9]/g, "").replace(/(.{2})/g, "$1:").slice(0, 17),
        port: e.port,
        vlan: e.vlan ?? null,
        port_type: portTypeMap.get(e.port) ?? "unknown",
        seen_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear stale entries for this OLT (snapshot semantics) then insert
    await supabase.from("olt_mac_table").delete().eq("olt_id", olt_id);

    const { error: insErr } = await supabase.from("olt_mac_table").insert(rows);
    if (insErr) throw insErr;

    // Auto-register unknown ports into olt_ports as 'access_pon' default
    const knownPorts = new Set(portTypeMap.keys());
    const newPorts = Array.from(new Set(rows.map((r) => r.port))).filter((p) => !knownPorts.has(p));
    if (newPorts.length > 0) {
      await supabase.from("olt_ports").insert(
        newPorts.map((port_name) => ({ olt_id, port_name, port_type: "access_pon" })),
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: rows.length, new_ports: newPorts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
