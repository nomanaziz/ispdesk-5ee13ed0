import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch a managed device row by id (any of the 4 source tables)
async function resolveDevice(supabase: any, deviceId: string, deviceType: string) {
  // MikroTik (router/api)
  if (deviceType === "mikrotik") {
    const { data } = await supabase.from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", deviceId).maybeSingle();
    if (data) return { source: "mikrotik_devices", row: data };
  }
  // Managed devices (olt/switch/generic/etc.)
  const { data: mg } = await supabase.from("device_admin_managed_devices")
    .select("*").eq("id", deviceId).maybeSingle();
  if (mg) return { source: "device_admin_managed_devices", row: mg };

  // Legacy fallbacks
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

async function inspectOlt(supabase: any, deviceId: string, resource: string) {
  if (resource === "users") {
    // ONU list + customer mapping
    const { data: onus } = await supabase.from("onu_list")
      .select("id, mac, interface, description, status, rx_power, tx_power, last_seen")
      .eq("olt_id", deviceId).order("interface");
    const ids = (onus || []).map((o: any) => o.id);
    const macs = (onus || []).map((o: any) => o.mac);
    const { data: maps } = ids.length
      ? await supabase.from("user_onu_mapping")
          .select("ppp_username, caller_id_mac, onu_id, status")
          .or(`onu_id.in.(${ids.join(",")}),caller_id_mac.in.(${macs.map((m: string) => `"${m}"`).join(",")})`)
      : { data: [] };
    const byOnu = new Map<string, any>();
    const byMac = new Map<string, any>();
    (maps || []).forEach((m: any) => {
      if (m.onu_id) byOnu.set(m.onu_id, m);
      if (m.caller_id_mac) byMac.set(m.caller_id_mac, m);
    });
    return (onus || []).map((r: any) => {
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
      .select("port_name, port_type, description").eq("olt_id", deviceId).order("port_name");
    const { data: onus } = await supabase.from("onu_list")
      .select("interface, status").eq("olt_id", deviceId);
    // Build interface set from ports + ONU interface names (in case ports table empty)
    const ifaceMap = new Map<string, { type: string; description: string | null; total: number; online: number }>();
    (ports || []).forEach((p: any) => {
      ifaceMap.set(p.port_name, { type: p.port_type || "pon", description: p.description, total: 0, online: 0 });
    });
    (onus || []).forEach((o: any) => {
      if (!o.interface) return;
      const cur = ifaceMap.get(o.interface) || { type: "pon", description: null, total: 0, online: 0 };
      cur.total++;
      if ((o.status || "").toLowerCase() === "online") cur.online++;
      ifaceMap.set(o.interface, cur);
    });
    return Array.from(ifaceMap.entries()).map(([name, v]) => ({
      name,
      type: v.type,
      total_onus: v.total,
      online_onus: v.online,
      description: v.description || "—",
      running: v.online > 0 ? "yes" : "no",
    }));
  }
  if (resource === "vlans" || resource === "vlan_ips") {
    return []; // BDCOM EPON VLAN OID — agent contract pending
  }
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
    // Unique VLANs from ports
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
    const { device_id, device_type = "mikrotik", resource } = await req.json();
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

    // Dispatch by effective type
    if (source === "mikrotik_devices" || category === "mikrotik" || (category === "router" && dev.vendor === "mikrotik")) {
      // need credentials — make sure shape matches withMikrotik helper
      const mk = source === "mikrotik_devices" ? dev : {
        id: dev.id, name: dev.name, ip_address: dev.ip_address,
        api_port: dev.port || 80, username: dev.username, password_encrypted: dev.password_encrypted,
      };
      data = await inspectMikrotik(mk, resource);
    } else if (category === "olt") {
      data = await inspectOlt(supabase, device_id, resource);
      if (data.length === 0 && (resource === "vlans" || resource === "vlan_ips")) {
        note = "OLT VLAN data — OID profile-এ map করুন বা agent sync চালান";
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
