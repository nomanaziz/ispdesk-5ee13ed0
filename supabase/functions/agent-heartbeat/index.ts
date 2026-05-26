// Agent heartbeat — agent calls this to register status & fetch assigned OLTs.
// Auth: agent sends its api_key in `x-agent-key` header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-agent-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "x-agent-key header required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const version = body.version ?? null;

    const { data: agent, error: agentErr } = await supabase
      .from("polling_agents")
      .select("id, name, branch_id, poll_interval_seconds")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "invalid api key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    await supabase.from("polling_agents").update({
      status: "online",
      last_heartbeat: now,
      version,
    }).eq("id", agent.id);

    // Return assigned OLTs
    const { data: olts } = await supabase
      .from("olt_devices")
      .select("id, name, vendor, pon_type, ip_address, snmp_ip, snmp_port, snmp_community, snmp_version")
      .eq("assigned_agent_id", agent.id);

    return new Response(JSON.stringify({
      ok: true,
      agent_id: agent.id,
      agent_name: agent.name,
      poll_interval: agent.poll_interval_seconds,
      olts: olts ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
