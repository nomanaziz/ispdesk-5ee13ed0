import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { device_id } = await req.json();
    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: device, error: fetchErr } = await supabase
      .from("mikrotik_devices")
      .select("ip_address, api_port, enabled")
      .eq("id", device_id)
      .single();

    if (fetchErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!device.enabled) {
      await supabase
        .from("mikrotik_devices")
        .update({ status: "offline" })
        .eq("id", device_id);
      return new Response(
        JSON.stringify({ status: "offline", reason: "Device disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try TCP connection to the MikroTik API port
    let status = "offline";
    try {
      const conn = await Deno.connect({
        hostname: device.ip_address,
        port: device.api_port || 8728,
      });
      conn.close();
      status = "online";
    } catch {
      status = "offline";
    }

    await supabase
      .from("mikrotik_devices")
      .update({ status })
      .eq("id", device_id);

    return new Response(JSON.stringify({ status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
