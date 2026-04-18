import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getGateway() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "payment_gateways")
    .maybeSingle();
  const gws = (data?.setting_value || []) as any[];
  return { supabase, gw: gws.find(g => g.name === "bKash Merchant" && g.active) };
}

async function grantToken(baseUrl: string, f: any) {
  const r = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "username": f.username || "",
      "password": f.password || "",
    },
    body: JSON.stringify({ app_key: f.app_key, app_secret: f.app_secret }),
  });
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    const { supabase, gw } = await getGateway();
    if (!gw) {
      return new Response(JSON.stringify({ status: false, message: "bKash Merchant not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const f = gw.fields || {};
    const sandbox = f.sandbox !== "false";
    const baseUrl = sandbox
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta";

    const tokenResp = await grantToken(baseUrl, f);
    if (!tokenResp.id_token) {
      return new Response(JSON.stringify({ status: false, message: "bKash token grant failed", detail: tokenResp }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": tokenResp.id_token,
      "X-APP-Key": f.app_key,
    };

    if (action === "create") {
      const { amount, callback_url, request_id, payer_reference } = params;
      const r = await fetch(`${baseUrl}/tokenized/checkout/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode: "0011",
          payerReference: payer_reference || "01",
          callbackURL: callback_url,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: request_id,
        }),
      });
      const data = await r.json();
      if (data.paymentID && params.payment_request_id) {
        await supabase.from("public_payment_requests")
          .update({ gateway_payment_id: data.paymentID, gateway_response: data })
          .eq("id", params.payment_request_id);
      }
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "execute") {
      const { paymentID } = params;
      const r = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
        method: "POST", headers, body: JSON.stringify({ paymentID }),
      });
      const data = await r.json();
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "query") {
      const { paymentID } = params;
      const r = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
        method: "POST", headers, body: JSON.stringify({ paymentID }),
      });
      const data = await r.json();
      return new Response(JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ status: false, message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("bkash-payment error", e);
    return new Response(JSON.stringify({ status: false, message: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
