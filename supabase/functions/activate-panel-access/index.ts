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
    const { customer_id, slab_id, payment_method, payment_reference, paid_amount } = await req.json();
    if (!customer_id || !slab_id) {
      return json({ error: "customer_id and slab_id are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up slab & customer
    const [{ data: slab }, { data: customer }] = await Promise.all([
      supabase.from("bw_panel_pricing_slabs").select("*").eq("id", slab_id).maybeSingle(),
      supabase.from("bw_sale_customers").select("*").eq("id", customer_id).maybeSingle(),
    ]);

    if (!slab) return json({ error: "Pricing slab not found" }, 404);
    if (!customer) return json({ error: "Customer not found" }, 404);

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

      // Seed default zones / sub-zones / boxes
      await supabase.rpc("seed_default_pop_hierarchy_for_branch", { _branch_id: branchId });
      await supabase.rpc("seed_pop_defaults", { _branch_id: branchId });
    }

    // Compute period (1 month). If renewing before expiry, extend from current expiry.
    const now = Date.now();
    const currentExpiry = customer.panel_subscription_expires_at
      ? new Date(customer.panel_subscription_expires_at).getTime()
      : 0;
    const periodStart = currentExpiry > now ? currentExpiry : now;
    const periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000;

    // Insert subscription history
    const { error: subErr } = await supabase.from("bw_panel_subscriptions").insert({
      customer_id,
      user_limit: slab.user_limit,
      monthly_price: slab.monthly_price,
      paid_amount: paid_amount ?? slab.monthly_price,
      payment_method: payment_method || "online",
      payment_reference: payment_reference || null,
      period_start: new Date(periodStart).toISOString(),
      period_end: new Date(periodEnd).toISOString(),
      status: "active",
    });
    if (subErr) {
      console.error("subscription insert error:", subErr);
      return json({ error: "Failed to record subscription" }, 500);
    }

    // Update customer
    const { error: updErr } = await supabase
      .from("bw_sale_customers")
      .update({
        panel_access_enabled: true,
        panel_user_limit: slab.user_limit,
        panel_subscription_started_at: new Date(now).toISOString(),
        panel_subscription_expires_at: new Date(periodEnd).toISOString(),
        panel_branch_id: branchId,
      })
      .eq("id", customer_id);

    if (updErr) {
      console.error("customer update error:", updErr);
      return json({ error: "Failed to activate panel access" }, 500);
    }

    return json({
      ok: true,
      branch_id: branchId,
      user_limit: slab.user_limit,
      expires_at: new Date(periodEnd).toISOString(),
    });
  } catch (err) {
    console.error("activate-panel-access error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
