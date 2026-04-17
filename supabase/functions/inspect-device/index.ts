import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { device_id, device_type = "mikrotik", resource } = await req.json();
    if (!device_id || !resource) throw new Error("device_id and resource required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (device_type !== "mikrotik") {
      return new Response(JSON.stringify({
        success: false,
        error: `Vendor adapter for ${device_type} not yet implemented. Only MikroTik supported currently.`,
        data: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const { data: dev, error: derr } = await supabase
      .from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password")
      .eq("id", device_id)
      .single();
    if (derr || !dev) throw new Error("Device not found");

    const auth = btoa(`${dev.username || "admin"}:${dev.password || ""}`);
    const base = `http://${dev.ip_address}:${dev.api_port || 80}/rest`;

    const endpoints: Record<string, string> = {
      users: "/user",
      interfaces: "/interface",
      vlans: "/interface/vlan",
      vlan_ips: "/ip/address",
      monitor: "/interface",
    };
    const path = endpoints[resource];
    if (!path) throw new Error("Invalid resource");

    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    let data = await res.json();

    // Filter VLAN IPs only (interfaces that look like vlan)
    if (resource === "vlan_ips" && Array.isArray(data)) {
      data = data.filter((ip: any) => /vlan/i.test(ip.interface || ""));
    }

    return new Response(JSON.stringify({ success: true, device: dev.name, resource, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message, data: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
