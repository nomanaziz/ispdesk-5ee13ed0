// Ingest SNMP data from the polling agent.
// Agent auth: x-agent-key header.
// Body: { olt_id, reachable, olt_meta?, onus?[], pon_ports?[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

function formatUptime(raw: any): string {
  if (raw == null) return "";
  const s = String(raw);
  if (/[a-z]/i.test(s)) return s;
  const ticks = Number(s);
  if (!isFinite(ticks) || ticks <= 0) return s;
  const totalSec = Math.floor(ticks / 100);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

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
      .from("polling_agents").select("id").eq("api_key", apiKey).maybeSingle();
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

    const { data: olt } = await supabase
      .from("olt_devices").select("id, assigned_agent_id").eq("id", olt_id).maybeSingle();
    if (!olt || olt.assigned_agent_id !== agent.id) {
      return new Response(JSON.stringify({ error: "olt not assigned to this agent" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const devUpdate: Record<string, unknown> = {
      last_seen: now,
      agent_last_seen: now,
      snmp_last_seen: now,
      last_data_source: "agent",
      status: reachable === false ? "offline" : "online",
      last_offline_reason: reachable === false ? (olt_meta?.error ?? "SNMP unreachable") : null,
    };
    if (olt_meta && typeof olt_meta === "object") {
      const m: any = olt_meta;
      // Accept all known fields
      for (const k of ["cpu_usage", "memory_usage", "brand_model", "firmware_version", "hardware_version", "serial_number", "mac_address", "name"]) {
        if (m[k] !== undefined && m[k] !== null && m[k] !== "") devUpdate[k] = m[k];
      }
      if (m.uptime !== undefined && m.uptime !== null) devUpdate.uptime = formatUptime(m.uptime);
      if (typeof m.total_onus === "number") devUpdate.total_onus = m.total_onus;
      if (typeof m.online_onus === "number") devUpdate.online_onus = m.online_onus;
    }
    await supabase.from("olt_devices").update(devUpdate).eq("id", olt_id);

    // ONU upserts
    let processed = 0;
    const alerts: any[] = [];
    if (Array.isArray(onus)) {
      for (const onu of onus) {
        if (!onu.mac) continue;
        const row: Record<string, unknown> = {
          olt_id, mac: onu.mac, interface: onu.interface,
          serial_number: onu.serial_number, description: onu.description,
          status: onu.status || "offline",
          rx_power: onu.rx_power, tx_power: onu.tx_power,
          last_seen: now, last_data_source: "agent",
        };
        for (const k of ["distance_m", "temperature", "alive_seconds", "onu_type"]) {
          if (onu[k] !== undefined && onu[k] !== null) row[k] = onu[k];
        }
        const { error } = await supabase.from("onu_list").upsert(row, { onConflict: "olt_id,mac" });
        if (!error) processed++;

        if (typeof onu.rx_power === "number") {
          if (onu.rx_power < -27) alerts.push({ type: "critical", message: `ONU ${onu.mac} RX critical: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
          else if (onu.rx_power < -24) alerts.push({ type: "warning", message: `ONU ${onu.mac} RX warning: ${onu.rx_power} dBm`, rx_power: onu.rx_power, channel: "dashboard" });
        }
      }
    }

    // PON / interface ports — replace strategy (avoid stale entries)
    let portsInserted = 0;
    if (Array.isArray(pon_ports)) {
      await supabase.from("olt_ports").delete().eq("olt_id", olt_id);
      const rows = pon_ports
        .filter((p: any) => p?.port_name)
        .map((p: any) => ({
          olt_id,
          port_name: String(p.port_name),
          port_type: p.port_type || "pon",
          description: p.description ?? null,
          admin_status: p.admin_status ?? null,
          oper_status: p.oper_status ?? null,
          speed_mbps: typeof p.speed_mbps === "number" ? p.speed_mbps : null,
          total_onus: typeof p.total_onus === "number" ? p.total_onus : 0,
          online_onus: typeof p.online_onus === "number" ? p.online_onus : 0,
          rx_power_dbm: typeof p.rx_power_dbm === "number" ? p.rx_power_dbm : null,
          last_seen: now,
        }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("olt_ports").insert(rows);
        if (!insErr) portsInserted = rows.length;
      }
    }

    if (alerts.length > 0) await supabase.from("alerts").insert(alerts);

    await supabase.from("polling_agents").update({ status: "online", last_heartbeat: now }).eq("id", agent.id);

    return new Response(JSON.stringify({ ok: true, processed, ports: portsInserted, alerts: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
