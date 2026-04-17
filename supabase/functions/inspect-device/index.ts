import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

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
        error: `${device_type} ভেন্ডরের জন্য adapter এখনো implement হয়নি — শুধু MikroTik supported।`,
        data: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const { data: dev, error: derr } = await supabase
      .from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", device_id)
      .single();
    if (derr || !dev) throw new Error("Device not found");

    const commandMap: Record<string, string> = {
      users: "/user/print",
      interfaces: "/interface/print",
      vlans: "/interface/vlan/print",
      vlan_ips: "/ip/address/print",
    };
    const cmd = commandMap[resource];
    if (!cmd) throw new Error("Invalid resource");

    let data = await withMikrotik(dev, async (conn) => mikrotikCommand(conn, cmd));

    if (resource === "vlan_ips") {
      data = data.filter((ip) => /vlan/i.test(ip.interface || ""));
    }

    return new Response(JSON.stringify({ success: true, device: dev.name, resource, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message, data: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
