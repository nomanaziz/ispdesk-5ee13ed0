import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: Nagad signing requires RSA encryption + signing with their public/your private keys.
// This is a simplified scaffold; production needs the full crypto pipeline.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase.from("system_settings")
      .select("setting_value").eq("setting_key", "payment_gateways").maybeSingle();
    const gw = ((data?.setting_value || []) as any[]).find(g => g.name === "Nagad Merchant" && g.active);
    if (!gw) {
      return new Response(JSON.stringify({ status: false, message: "Nagad Merchant not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const f = gw.fields || {};
    const sandbox = f.sandbox !== "false";
    const baseUrl = sandbox
      ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs"
      : "https://api.mynagad.com/api/dfs";

    if (action === "create") {
      // Full Nagad flow needs RSA signature/encryption. Returning instructive error if keys missing.
      if (!f.public_key || !f.private_key) {
        return new Response(JSON.stringify({
          status: false,
          message: "Nagad public_key এবং private_key configure করুন। RSA signing ছাড়া checkout সম্ভব না।",
          base_url: baseUrl,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Placeholder — wire up actual init/complete after keys are provided.
      return new Response(JSON.stringify({
        status: false,
        message: "Nagad RSA-signed flow এখনো wire-up বাকি। Keys পেলে complete করব।",
      }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify") {
      const { payment_ref_id } = params;
      const r = await fetch(`${baseUrl}/verify/payment/${payment_ref_id}`);
      const data = await r.json();
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ status: false, message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("nagad-payment error", e);
    return new Response(JSON.stringify({ status: false, message: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
