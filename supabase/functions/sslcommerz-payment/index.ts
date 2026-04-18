import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const gw = ((data?.setting_value || []) as any[]).find(g => g.name === "SSLCommerz" && g.active);
    if (!gw) {
      return new Response(JSON.stringify({ status: "FAILED", message: "SSLCommerz not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const f = gw.fields || {};
    const sandbox = f.sandbox !== "false";
    const baseUrl = sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";

    if (action === "create") {
      const { amount, success_url, fail_url, cancel_url, ipn_url, cus_name, cus_email, cus_phone, tran_id, product_name } = params;
      const body = new URLSearchParams({
        store_id: f.store_id || "",
        store_passwd: f.store_password || "",
        total_amount: String(amount),
        currency: "BDT",
        tran_id,
        success_url, fail_url, cancel_url,
        ipn_url: ipn_url || success_url,
        cus_name: cus_name || "Customer",
        cus_email: cus_email || "noreply@example.com",
        cus_phone: cus_phone || "0000000000",
        cus_add1: "N/A",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: product_name || "Bill Payment",
        product_category: "Service",
        product_profile: "non-physical-goods",
      });
      const r = await fetch(`${baseUrl}/gwprocess/v4/api.php`, { method: "POST", body });
      const data = await r.json();
      if (data.GatewayPageURL && params.payment_request_id) {
        await supabase.from("public_payment_requests")
          .update({ gateway_payment_id: data.sessionkey || tran_id, gateway_response: data })
          .eq("id", params.payment_request_id);
      }
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "validate") {
      const { val_id } = params;
      const url = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(f.store_id)}&store_passwd=${encodeURIComponent(f.store_password)}&format=json`;
      const r = await fetch(url);
      const data = await r.json();
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ status: "FAILED", message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sslcommerz-payment error", e);
    return new Response(JSON.stringify({ status: "FAILED", message: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
