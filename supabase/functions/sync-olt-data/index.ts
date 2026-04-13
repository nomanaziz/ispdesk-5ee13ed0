import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { olt_id, onus } = body; // olt_id: UUID, onus: Array of { interface, mac, serial_number, description, status, rx_power, tx_power }

    if (!olt_id || !Array.isArray(onus)) {
      return new Response(JSON.stringify({ error: "olt_id and onus array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0;
    const alerts: any[] = [];

    for (const onu of onus) {
      // Upsert ONU
      const { data: onuData, error } = await supabase.from("onu_list").upsert(
        {
          olt_id,
          mac: onu.mac,
          interface: onu.interface,
          serial_number: onu.serial_number,
          description: onu.description,
          status: onu.status || "offline",
          rx_power: onu.rx_power,
          tx_power: onu.tx_power,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "olt_id,mac" }
      );
      if (!error) processed++;

      // Store history
      if (onu.mac) {
        const { data: existingOnu } = await supabase.from("onu_list").select("id").eq("olt_id", olt_id).eq("mac", onu.mac).single();
        if (existingOnu) {
          await supabase.from("onu_history").insert({
            onu_id: existingOnu.id,
            rx_power: onu.rx_power,
            tx_power: onu.tx_power,
            status: onu.status || "offline",
          });

          // Check alert thresholds
          if (onu.rx_power !== null && onu.rx_power !== undefined) {
            if (onu.rx_power < -27) {
              alerts.push({ onu_id: existingOnu.id, type: "critical", message: `ONU ${onu.mac} RX Power critical: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
            } else if (onu.rx_power < -24) {
              alerts.push({ onu_id: existingOnu.id, type: "warning", message: `ONU ${onu.mac} RX Power warning: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
            }
          }

          if (onu.status === "offline") {
            alerts.push({ onu_id: existingOnu.id, type: "offline", message: `ONU ${onu.mac} went offline`, channel: "dashboard" });
          }
        }
      }
    }

    // Insert alerts
    if (alerts.length > 0) {
      await supabase.from("alerts").insert(alerts);
    }

    return new Response(JSON.stringify({ ok: true, processed, alerts_created: alerts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
