import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function resolveDevice(supabase: any, deviceId: string, deviceType: string) {
  if (deviceType === "mikrotik") {
    const { data } = await supabase.from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", deviceId).maybeSingle();
    if (data) return { source: "mikrotik_devices", row: data };
  }
  const { data: mg } = await supabase.from("device_admin_managed_devices")
    .select("*").eq("id", deviceId).maybeSingle();
  if (mg) return { source: "device_admin_managed_devices", row: mg };

  const { data: olt } = await supabase.from("olt_devices").select("*").eq("id", deviceId).maybeSingle();
  if (olt) return { source: "olt_devices", row: olt };
  const { data: sw } = await supabase.from("pop_devices").select("*").eq("id", deviceId).maybeSingle();
  if (sw) return { source: "pop_devices", row: sw };

  return null;
}

async function inspectMikrotik(dev: any, resource: string) {
  const commandMap: Record<string, string> = {
    users: "/user/print",
    interfaces: "/interface/print",
    vlans: "/interface/vlan/print",
    vlan_ips: "/ip/address/print",
  };
  const cmd = commandMap[resource];
  if (!cmd) throw new Error("Invalid resource");
  let data = await withMikrotik(dev, async (conn: any) => mikrotikCommand(conn, cmd));
  if (resource === "vlan_ips") data = data.filter((ip: any) => /vlan/i.test(ip.interface || ""));
  return data;
}

// EPON/GPON/SFP detect helper (port_name pattern fallback)
function detectPortType(name: string, fallback: string | null): string {
  const n = (name || "").toLowerCase();
  if (/epon/.test(n)) return "epon";
  if (/gpon/.test(n)) return "gpon";
  if (/tengig|10g|xge/.test(n)) return "sfp+";
  if (/giga|gigabit|^ge/.test(n)) return "sfp";
  if (/uplink/.test(n)) return "uplink";
  return (fallback || "other").toLowerCase();
}

async function inspectOlt(supabase: any, deviceId: string, resource: string, opts: { mode?: string } = {}) {
  if (resource === "system") {
    const { data: olt } = await supabase.from("olt_devices")
      .select("brand_model, hardware_version, firmware_version, olt_version, uptime, mac_address, serial_number, total_onus, online_onus, status, agent_last_seen, snmp_last_seen, last_data_source, pon_type")
      .eq("id", deviceId).maybeSingle();
    const { data: ports } = await supabase.from("olt_ports")
      .select("port_name, port_type, oper_status, admin_status").eq("olt_id", deviceId);
    const counts: Record<string, number> = { epon: 0, gpon: 0, sfp: 0, "sfp+": 0, uplink: 0, other: 0 };
    let up = 0, down = 0;
    (ports || []).forEach((p: any) => {
      const t = detectPortType(p.port_name, p.port_type);
      counts[t] = (counts[t] || 0) + 1;
      const s = (p.oper_status || "").toLowerCase();
      if (s === "up") up++;
      else if (s === "down") down++;
    });
    return [{
      brand_model: olt?.brand_model || "—",
      hardware_version: olt?.hardware_version || "—",
      firmware_version: olt?.firmware_version || olt?.olt_version || "—",
      serial_number: olt?.serial_number || "—",
      mac_address: olt?.mac_address || "—",
      uptime: olt?.uptime || "—",
      status: olt?.status || "—",
      pon_type: olt?.pon_type || "—",
      total_interfaces: (ports || []).length,
      epon_count: counts.epon,
      gpon_count: counts.gpon,
      sfp_count: counts.sfp + counts["sfp+"],
      uplink_count: counts.uplink,
      other_count: counts.other,
      ports_up: up,
      ports_down: down,
      total_onus: olt?.total_onus ?? 0,
      online_onus: olt?.online_onus ?? 0,
      agent_last_seen: olt?.agent_last_seen,
      snmp_last_seen: olt?.snmp_last_seen,
      last_data_source: olt?.last_data_source || "—",
    }];
  }

  if (resource === "users") {
    const { data: onus } = await supabase.from("onu_list")
      .select("id, mac, interface, description, status, rx_power, tx_power, last_seen")
      .eq("olt_id", deviceId).order("interface");
    const list = onus || [];
    const mode = opts.mode === "with-user" ? "with-user" : "olt-only";

    if (mode === "olt-only") {
      // Pure OLT view — no mapping join
      return list.map((r: any) => ({
        name: r.description || r.mac || "—",
        mac: r.mac,
        pon: r.interface,
        status: r.status,
        rx_power: r.rx_power,
        tx_power: r.tx_power,
        mapping: "—",
        "last-logged-in": r.last_seen,
      }));
    }

    // with-user: join user_onu_mapping
    const ids = list.map((o: any) => o.id);
    const macs = list.map((o: any) => o.mac).filter(Boolean);
    let maps: any[] = [];
    if (ids.length) {
      const filters: string[] = [];
      if (ids.length) filters.push(`onu_id.in.(${ids.join(",")})`);
      if (macs.length) filters.push(`caller_id_mac.in.(${macs.map((m: string) => `"${m}"`).join(",")})`);
      const { data } = await supabase.from("user_onu_mapping")
        .select("ppp_username, caller_id_mac, onu_id, status")
        .or(filters.join(","));
      maps = data || [];
    }
    const byOnu = new Map<string, any>();
    const byMac = new Map<string, any>();
    maps.forEach((m: any) => {
      if (m.onu_id) byOnu.set(m.onu_id, m);
      if (m.caller_id_mac) byMac.set(m.caller_id_mac, m);
    });
    return list.map((r: any) => {
      const m = byOnu.get(r.id) || byMac.get(r.mac);
      return {
        name: m?.ppp_username || r.description || r.mac,
        mac: r.mac,
        pon: r.interface,
        status: r.status,
        rx_power: r.rx_power,
        tx_power: r.tx_power,
        mapping: m?.status || (m ? "mapped" : "—"),
        "last-logged-in": r.last_seen,
      };
    });
  }

  if (resource === "interfaces") {
    const { data: ports } = await supabase.from("olt_ports")
      .select("port_name, port_type, description, oper_status, admin_status, speed_mbps, total_onus, online_onus, rx_power_dbm")
      .eq("olt_id", deviceId).order("port_name");
    const { data: onus } = await supabase.from("onu_list")
      .select("interface, status").eq("olt_id", deviceId);

    const ifaceMap = new Map<string, any>();
    (ports || []).forEach((p: any) => {
      ifaceMap.set(p.port_name, {
        type: detectPortType(p.port_name, p.port_type),
        description: p.description,
        oper_status: p.oper_status || "—",
        admin_status: p.admin_status || "—",
        speed_mbps: p.speed_mbps,
        total: p.total_onus ?? 0,
        online: p.online_onus ?? 0,
        rx_power: p.rx_power_dbm,
      });
    });
    (onus || []).forEach((o: any) => {
      if (!o.interface) return;
      // strip ":N" llid suffix for port aggregation
      const portName = o.interface.replace(/[:.]\d+$/, "");
      const cur = ifaceMap.get(portName) || {
        type: detectPortType(portName, null),
        description: null, oper_status: "—", admin_status: "—",
        speed_mbps: null, total: 0, online: 0, rx_power: null,
      };
      // only auto-count when port row didn't provide explicit counts
      if (!cur._hasExplicit) {
        cur.total++;
        if ((o.status || "").toLowerCase() === "online") cur.online++;
      }
      ifaceMap.set(portName, cur);
    });
    return Array.from(ifaceMap.entries()).map(([name, v]) => ({
      name,
      type: v.type,
      oper_status: v.oper_status,
      admin_status: v.admin_status,
      total_onus: v.total,
      online_onus: v.online,
      rx_power: v.rx_power ?? "—",
      description: v.description || "—",
    }));
  }

  if (resource === "vlans" || resource === "vlan_ips") return [];
  return [];
}

async function inspectSwitch(supabase: any, deviceId: string, resource: string) {
  if (resource === "interfaces") {
    const { data } = await supabase.from("switch_ports")
      .select("interface, description, oper_status, admin_status, speed_mbps, mac_address, vlan_id")
      .eq("switch_id", deviceId).order("if_index");
    return (data || []).map((p: any) => ({
      name: p.interface,
      type: `${p.speed_mbps ?? "?"}M`,
      "mac-address": p.mac_address || "—",
      running: p.oper_status === "up" ? "yes" : "no",
      mtu: "—",
      description: p.description,
      vlan: p.vlan_id,
    }));
  }
  if (resource === "vlans") {
    const { data } = await supabase.from("switch_ports")
      .select("vlan_id, interface").eq("switch_id", deviceId);
    const map = new Map<number, string[]>();
    (data || []).forEach((r: any) => {
      if (r.vlan_id == null) return;
      const arr = map.get(r.vlan_id) || [];
      arr.push(r.interface);
      map.set(r.vlan_id, arr);
    });
    return Array.from(map.entries()).map(([vid, ports]) => ({
      name: `VLAN ${vid}`, "vlan-id": vid, interface: ports.join(", "), disabled: "no",
    }));
  }
  return [];
}

async function inspectZkteco(supabase: any, deviceId: string) {
  const { data } = await supabase.from("device_admin_user_inventory")
    .select("username, permission, last_synced_at, raw_data")
    .eq("device_id", deviceId);
  return (data || []).map((u: any) => ({
    name: u.username, group: u.permission, address: "—", "last-logged-in": u.last_synced_at,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { device_id, device_type = "mikrotik", resource, mode } = await req.json();
    if (!device_id || !resource) throw new Error("device_id and resource required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resolved = await resolveDevice(supabase, device_id, device_type);
    if (!resolved) throw new Error("Device not found");
    const { row: dev, source } = resolved;
    const category = (dev.category || device_type || "").toLowerCase();

    let data: any[] = [];
    let note: string | undefined;

    if (source === "mikrotik_devices" || category === "mikrotik" || (category === "router" && dev.vendor === "mikrotik")) {
      const mk = source === "mikrotik_devices" ? dev : {
        id: dev.id, name: dev.name, ip_address: dev.ip_address,
        api_port: dev.port || 80, username: dev.username, password_encrypted: dev.password_encrypted,
      };
      data = await inspectMikrotik(mk, resource);
    } else if (category === "olt") {
      data = await inspectOlt(supabase, device_id, resource, { mode });
      if (data.length === 0 && (resource === "vlans" || resource === "vlan_ips")) {
        note = "OLT VLAN data — agent contract pending (BDCOM-specific OID)";
      }
    } else if (category === "switch") {
      data = await inspectSwitch(supabase, device_id, resource);
      if (resource === "users" || resource === "vlan_ips") {
        note = "Switch-এ এই resource সাধারণত থাকে না";
      }
    } else if (category === "zkteco") {
      if (resource === "users") data = await inspectZkteco(supabase, device_id);
      else note = "ZKTeco device-এ শুধু Users available";
    } else {
      note = `${category} টাইপ inspector এ এখনো support হয়নি`;
    }

    return new Response(JSON.stringify({ success: true, device: dev.name, resource, data, note }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message, data: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
