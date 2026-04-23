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

const DEMO_USER_LIMIT = 50;
const DEMO_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { customer_id, slab_id, payment_method, payment_reference, paid_amount, trial } =
      await req.json();
    if (!customer_id) return json({ error: "customer_id is required" }, 400);
    if (!trial && !slab_id) return json({ error: "slab_id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: customer } = await supabase
      .from("bw_sale_customers")
      .select("*")
      .eq("id", customer_id)
      .maybeSingle();
    if (!customer) return json({ error: "Customer not found" }, 404);

    let userLimit: number;
    let monthlyPrice: number;
    let resolvedPaymentMethod = payment_method || "online";

    if (trial) {
      if ((customer as any).panel_demo_used) {
        return json({ error: "ফ্রি ট্রায়াল ইতিমধ্যে ব্যবহার করা হয়েছে।" }, 400);
      }
      userLimit = DEMO_USER_LIMIT;
      monthlyPrice = 0;
      resolvedPaymentMethod = "demo";
    } else {
      const { data: slab } = await supabase
        .from("bw_panel_pricing_slabs")
        .select("*")
        .eq("id", slab_id)
        .maybeSingle();
      if (!slab) return json({ error: "Pricing slab not found" }, 404);
      userLimit = slab.user_limit;
      monthlyPrice = Number(slab.monthly_price);
    }

    // Ensure a branch exists for this customer
    let branchId = customer.panel_branch_id as string | null;
    if (!branchId) {
      const { data: newBranch, error: branchErr } = await supabase
        .from("branches")
        .insert({
          name: `${customer.customer_name} Panel`,
          location: customer.address || customer.customer_name,
        })
        .select("id")
        .single();
      if (branchErr || !newBranch) {
        console.error("branch create error:", branchErr);
        return json({ error: "Failed to create panel branch" }, 500);
      }
      branchId = newBranch.id;
      await supabase.rpc("seed_default_pop_hierarchy_for_branch", { _branch_id: branchId });
      await supabase.rpc("seed_pop_defaults", { _branch_id: branchId });
    }

    const now = Date.now();
    const currentExpiry = customer.panel_subscription_expires_at
      ? new Date(customer.panel_subscription_expires_at).getTime()
      : 0;
    const periodStart = currentExpiry > now ? currentExpiry : now;
    const days = trial ? DEMO_DAYS : 30;
    const periodEnd = periodStart + days * 24 * 60 * 60 * 1000;

    const { error: subErr } = await supabase.from("bw_panel_subscriptions").insert({
      customer_id,
      user_limit: userLimit,
      monthly_price: monthlyPrice,
      paid_amount: trial ? 0 : (paid_amount ?? monthlyPrice),
      payment_method: resolvedPaymentMethod,
      payment_reference: payment_reference || (trial ? "FREE_TRIAL" : null),
      period_start: new Date(periodStart).toISOString(),
      period_end: new Date(periodEnd).toISOString(),
      status: "active",
    });
    if (subErr) {
      console.error("subscription insert error:", subErr);
      return json({ error: "Failed to record subscription" }, 500);
    }

    const customerUpdate: Record<string, unknown> = {
      panel_access_enabled: true,
      panel_user_limit: userLimit,
      panel_subscription_started_at: new Date(now).toISOString(),
      panel_subscription_expires_at: new Date(periodEnd).toISOString(),
      panel_branch_id: branchId,
    };
    if (trial) customerUpdate.panel_demo_used = true;

    const { error: updErr } = await supabase
      .from("bw_sale_customers")
      .update(customerUpdate)
      .eq("id", customer_id);

    if (updErr) {
      console.error("customer update error:", updErr);
      return json({ error: "Failed to activate panel access" }, 500);
    }

    return json({
      ok: true,
      branch_id: branchId,
      user_limit: userLimit,
      expires_at: new Date(periodEnd).toISOString(),
      trial: !!trial,
    });
  } catch (err) {
    console.error("activate-panel-access error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
