import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { device_id, username, disable } = await req.json();
    if (!device_id || !username || typeof disable !== "boolean") {
      return new Response(JSON.stringify({ error: "device_id, username, disable required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: dev, error } = await supabase
      .from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", device_id)
      .single();
    if (error || !dev) throw new Error("Device পাওয়া যায়নি");

    const result = await withMikrotik(dev, async (conn) => {
      const found = await mikrotikCommand(conn, "/user/print", { "?name": username });
      if (found.length === 0) throw new Error(`Username "${username}" device-এ নেই`);
      const id = found[0][".id"];
      if (!id) throw new Error("User .id পাওয়া যায়নি");
      await mikrotikCommand(conn, "/user/set", { ".id": id, disabled: disable ? "yes" : "no" });
      return { id, username, disabled: disable };
    });

    // update local inventory flag
    await supabase
      .from("device_admin_user_inventory")
      .update({ raw_data: { ...(result as any), disabled: disable ? "true" : "false" } })
      .eq("device_type", "mikrotik")
      .eq("device_id", device_id)
      .eq("username", username);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
