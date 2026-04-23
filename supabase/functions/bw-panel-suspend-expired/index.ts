import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const nowIso = new Date().toISOString();

    // Find expired subscriptions
    const { data: expired } = await supabase
      .from("bw_sale_customers")
      .select("id, customer_name, panel_subscription_expires_at")
      .eq("panel_access_enabled", true)
      .lt("panel_subscription_expires_at", nowIso);

    if (!expired || expired.length === 0) {
      return json({ ok: true, suspended: 0 });
    }

    const ids = expired.map((c) => c.id);

    // Suspend customers
    await supabase
      .from("bw_sale_customers")
      .update({ panel_access_enabled: false })
      .in("id", ids);

    // Mark subscription rows as expired
    await supabase
      .from("bw_panel_subscriptions")
      .update({ status: "expired" })
      .in("customer_id", ids)
      .eq("status", "active")
      .lt("period_end", nowIso);

    console.log(`Suspended ${ids.length} expired panel subscriptions`);
    return json({ ok: true, suspended: ids.length, customers: expired });
  } catch (err) {
    console.error("bw-panel-suspend-expired error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
