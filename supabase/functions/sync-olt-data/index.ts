import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

/**
 * Body:
 * {
 *   olt_id: string,
 *   source: 'agent' | 'snmp',   // who is calling
 *   onus: Array<{
 *     interface, mac, serial_number, description, status,
 *     rx_power, tx_power,
 *     distance_m?, temperature?, alive_seconds?,
 *     last_offline_at?, last_offline_reason?,
 *     vendor_id?, model_id?, onu_type?,
 *     ethernet_count?, wifi_count?, response_time_ms?
 *   }>,
 *   olt_meta?: { cpu_usage?, memory_usage?, uptime?, last_offline_reason? }
 * }
 *
 * Source policy (per olt_devices.data_source_priority):
 *   agent_only  → reject snmp writes
 *   snmp_only   → reject agent writes
 *   agent_first → allow agent always; allow snmp only if agent stale (>= agent_stale_seconds since agent_last_seen) and snmp_fallback_enabled
 *   snmp_first  → allow snmp always; allow agent always (agent is non-primary fallback)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { olt_id, onus, olt_meta } = body;
    const source: "agent" | "snmp" = body.source === "snmp" ? "snmp" : "agent";

    if (!olt_id || !Array.isArray(onus)) {
      return new Response(
        JSON.stringify({ error: "olt_id and onus array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load device config
    const { data: device, error: devErr } = await supabase
      .from("olt_devices")
      .select(
        "id, data_source_priority, agent_enabled, snmp_fallback_enabled, agent_stale_seconds, agent_last_seen, snmp_last_seen",
      )
      .eq("id", olt_id)
      .single();

    if (devErr || !device) {
      return new Response(JSON.stringify({ error: "olt not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priority = device.data_source_priority || "agent_first";
    const staleSec = device.agent_stale_seconds || 180;

    // Decide whether this source is allowed to write right now
    let accepted = false;
    let reason = "";

    if (source === "agent") {
      if (!device.agent_enabled) {
        reason = "agent disabled for this device";
      } else if (priority === "snmp_only") {
        reason = "device configured as snmp_only";
      } else {
        accepted = true;
      }
    } else {
      // source === 'snmp'
      if (priority === "agent_only") {
        reason = "device configured as agent_only";
      } else if (priority === "snmp_first" || priority === "snmp_only") {
        accepted = true;
      } else if (priority === "agent_first") {
        if (!device.snmp_fallback_enabled) {
          reason = "snmp fallback disabled";
        } else {
          // Allow only if agent is stale
          const agentLast = device.agent_last_seen ? new Date(device.agent_last_seen).getTime() : 0;
          const agentAgeSec = (Date.now() - agentLast) / 1000;
          if (!device.agent_last_seen || agentAgeSec >= staleSec) {
            accepted = true;
          } else {
            reason = `agent fresh (${Math.round(agentAgeSec)}s < ${staleSec}s) — snmp skipped`;
          }
        }
      }
    }

    if (!accepted) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, source, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date().toISOString();
    let processed = 0;
    const alerts: any[] = [];

    for (const onu of onus) {
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
        last_data_source: source,
      };
      // Optional technical fields (only set when provided)
      for (
        const k of [
          "distance_m",
          "temperature",
          "alive_seconds",
          "last_offline_at",
          "last_offline_reason",
          "vendor_id",
          "model_id",
          "onu_type",
          "ethernet_count",
          "wifi_count",
          "response_time_ms",
        ]
      ) {
        if (onu[k] !== undefined && onu[k] !== null) row[k] = onu[k];
      }

      const { error } = await supabase
        .from("onu_list")
        .upsert(row, { onConflict: "olt_id,mac" });
      if (!error) processed++;

      if (onu.mac) {
        const { data: existingOnu } = await supabase
          .from("onu_list")
          .select("id")
          .eq("olt_id", olt_id)
          .eq("mac", onu.mac)
          .single();
        if (existingOnu) {
          await supabase.from("onu_history").insert({
            onu_id: existingOnu.id,
            rx_power: onu.rx_power,
            tx_power: onu.tx_power,
            status: onu.status || "offline",
          });

          if (onu.rx_power !== null && onu.rx_power !== undefined) {
            if (onu.rx_power < -27) {
              alerts.push({
                onu_id: existingOnu.id,
                type: "critical",
                message: `ONU ${onu.mac} RX Power critical: ${onu.rx_power} dBm`,
                rx_power: onu.rx_power,
                channel: "dashboard",
              });
            } else if (onu.rx_power < -24) {
              alerts.push({
                onu_id: existingOnu.id,
                type: "warning",
                message: `ONU ${onu.mac} RX Power warning: ${onu.rx_power} dBm`,
                rx_power: onu.rx_power,
                channel: "dashboard",
              });
            }
          }

          if (onu.status === "offline") {
            alerts.push({
              onu_id: existingOnu.id,
              type: "offline",
              message: `ONU ${onu.mac} went offline`,
              channel: "dashboard",
            });
          }
        }
      }
    }

    if (alerts.length > 0) {
      await supabase.from("alerts").insert(alerts);
    }

    // Stamp device with source telemetry + optional meta
    const devUpdate: Record<string, unknown> = {
      last_seen: now,
      last_data_source: source,
    };
    if (source === "agent") devUpdate.agent_last_seen = now;
    if (source === "snmp") devUpdate.snmp_last_seen = now;
    if (olt_meta && typeof olt_meta === "object") {
      for (const k of ["cpu_usage", "memory_usage", "uptime", "last_offline_reason"]) {
        if (olt_meta[k] !== undefined && olt_meta[k] !== null) devUpdate[k] = olt_meta[k];
      }
    }
    await supabase.from("olt_devices").update(devUpdate).eq("id", olt_id);

    return new Response(
      JSON.stringify({ ok: true, source, processed, alerts_created: alerts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
