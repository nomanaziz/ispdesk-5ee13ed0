// Ingest SNMP data from the polling agent.
// Agent auth: x-agent-key header. Body: { olt_id, olt_meta?, onus[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-agent-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "x-agent-key required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: agent } = await supabase
      .from("polling_agents")
      .select("id")
      .eq("api_key", apiKey)
      .maybeSingle();
    if (!agent) {
      return new Response(JSON.stringify({ error: "invalid api key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { olt_id, olt_meta, onus, reachable, pon_ports } = body;
    if (!olt_id) {
      return new Response(JSON.stringify({ error: "olt_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm OLT is assigned to this agent
    const { data: olt } = await supabase
      .from("olt_devices")
      .select("id, assigned_agent_id")
      .eq("id", olt_id)
      .maybeSingle();
    if (!olt || olt.assigned_agent_id !== agent.id) {
      return new Response(JSON.stringify({ error: "olt not assigned to this agent" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const devUpdate: Record<string, unknown> = {
      last_seen: now,
      snmp_last_seen: now,
      last_data_source: "snmp",
      status: reachable === false ? "offline" : "online",
    };
    if (reachable === false) {
      devUpdate.last_offline_reason = olt_meta?.error ?? "SNMP unreachable";
    } else {
      devUpdate.last_offline_reason = null;
    }
    if (olt_meta && typeof olt_meta === "object") {
      for (const k of ["cpu_usage", "memory_usage", "uptime", "brand_model", "firmware_version", "name"]) {
        if (olt_meta[k] !== undefined && olt_meta[k] !== null) devUpdate[k] = olt_meta[k];
      }
      if (typeof olt_meta.total_onus === "number") devUpdate.total_onus = olt_meta.total_onus;
      if (typeof olt_meta.online_onus === "number") devUpdate.online_onus = olt_meta.online_onus;
    }
    await supabase.from("olt_devices").update(devUpdate).eq("id", olt_id);

    let processed = 0;
    const alerts: any[] = [];

    if (Array.isArray(onus)) {
      for (const onu of onus) {
        if (!onu.mac) continue;
        const row: Record<string, unknown> = {
          olt_id,
          mac: onu.mac,
          interface: onu.interface,
          serial_number: onu.serial_number,
          description: onu.description,
          status: onu.status || "offline",
          rx_power: onu.rx_power,
          tx_power: onu.tx_power,
          last_seen: now,
          last_data_source: "snmp",
        };
        for (const k of ["distance_m", "temperature", "alive_seconds", "onu_type"]) {
          if (onu[k] !== undefined && onu[k] !== null) row[k] = onu[k];
        }
        const { error } = await supabase
          .from("onu_list")
          .upsert(row, { onConflict: "olt_id,mac" });
        if (!error) processed++;

        if (typeof onu.rx_power === "number") {
          if (onu.rx_power < -27) {
            alerts.push({ type: "critical", message: `ONU ${onu.mac} RX critical: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
          } else if (onu.rx_power < -24) {
            alerts.push({ type: "warning", message: `ONU ${onu.mac} RX warning: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
          }
        }
      }
    }

    // Optional: PON port snapshot from agent
    let portsUpserted = 0;
    if (Array.isArray(pon_ports)) {
      for (const p of pon_ports) {
        if (!p?.port_name) continue;
        const { error } = await supabase.from("olt_ports").upsert({
          olt_id,
          port_name: String(p.port_name),
          port_type: p.port_type || "pon",
          description: p.description ?? null,
        }, { onConflict: "olt_id,port_name" });
        if (!error) portsUpserted++;
      }
    }

    if (alerts.length > 0) {
      await supabase.from("alerts").insert(alerts);
    }

    // Update agent heartbeat too
    await supabase.from("polling_agents").update({
      status: "online", last_heartbeat: now,
    }).eq("id", agent.id);

    return new Response(JSON.stringify({ ok: true, processed, ports: portsUpserted, alerts: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
