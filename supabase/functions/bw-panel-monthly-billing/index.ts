import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch active panel customers + their tier
    const { data: customers, error: cErr } = await supabase
      .from("bw_sale_customers")
      .select(
        "id, customer_name, active_client_count, current_tier_id, next_month_estimated_bill, panel_access_enabled, panel_subscription_expires_at",
      )
      .eq("panel_access_enabled", true)
      .not("panel_branch_id", "is", null);

    if (cErr) throw cErr;

    const { data: tiers, error: tErr } = await supabase
      .from("bw_panel_pricing_slabs")
      .select("*")
      .eq("is_active", true);
    if (tErr) throw tErr;

    const tierMap = new Map((tiers || []).map((t: any) => [t.id, t]));

    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    let generated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const c of customers || []) {
      const tier: any = c.current_tier_id ? tierMap.get(c.current_tier_id) : null;
      if (!tier) {
        skipped++;
        continue;
      }

      let amount = 0;
      if (tier.billing_mode === "flat") amount = Number(tier.flat_price || 0);
      else if (tier.billing_mode === "per_user")
        amount = Number(tier.per_user_rate || 0) * Number(c.active_client_count || 0);
      else amount = 0;

      // Skip free tier — no bill needed
      if (amount <= 0) {
        skipped++;
        continue;
      }

      // Avoid duplicate for same period
      const { data: existing } = await supabase
        .from("bw_panel_subscriptions")
        .select("id")
        .eq("customer_id", c.id)
        .eq("period_start", periodStart)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insErr } = await supabase
        .from("bw_panel_subscriptions")
        .insert({
          customer_id: c.id,
          monthly_price: amount,
          paid_amount: 0,
          user_limit: tier.max_users ?? c.active_client_count,
          period_start: periodStart,
          period_end: periodEnd,
          status: "pending",
          payment_method: "auto-generated",
          payment_reference: `tier:${tier.tier_name}|users:${c.active_client_count}`,
        });

      if (insErr) {
        errors.push({ customer: c.customer_name, error: insErr.message });
      } else {
        generated++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        period: { periodStart, periodEnd },
        generated,
        skipped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("bw-panel-monthly-billing error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
