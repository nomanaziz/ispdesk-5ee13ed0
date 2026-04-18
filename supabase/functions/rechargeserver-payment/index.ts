import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RS_API = "https://payment.rechargeserver.com/api/payment";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // Get gateway config from system_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "payment_gateways")
      .single();

    if (!setting?.value) {
      return new Response(
        JSON.stringify({ status: false, message: "Payment gateways not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gateways = setting.value as any[];
    const rs = gateways.find((g: any) => g.name === "RechargeServer" && g.active);

    if (!rs) {
      return new Response(
        JSON.stringify({ status: false, message: "RechargeServer gateway is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both new (fields.*) and legacy (top-level) schemas
    const f = rs.fields || rs;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "API-KEY": f.api_key || "",
      "SECRET-KEY": f.secret_key || "",
      "BRAND-KEY": f.brand_key || "",
    };

    if (action === "create") {
      const { cus_name, cus_email, amount, success_url, cancel_url, meta_data } = params;

      if (!amount || !success_url || !cancel_url) {
        return new Response(
          JSON.stringify({ status: false, message: "amount, success_url, cancel_url are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body: any = { amount: String(amount), success_url, cancel_url };
      if (cus_name) body.cus_name = cus_name;
      if (cus_email) body.cus_email = cus_email;
      if (meta_data) body.metadata = meta_data;

      const res = await fetch(`${RS_API}/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify") {
      const { transaction_id } = params;

      if (!transaction_id) {
        return new Response(
          JSON.stringify({ status: false, message: "transaction_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${RS_API}/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ transaction_id }),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(
        JSON.stringify({ status: false, message: "Invalid action. Use 'create' or 'verify'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("RechargeServer payment error:", err);
    return new Response(
      JSON.stringify({ status: false, message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
