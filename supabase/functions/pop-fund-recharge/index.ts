// POP self-service fund recharge — creates a pop_fund_recharges row + bKash checkout URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { pop_id, amount, gateway = "bkash", payer_reference } = body || {};
    if (!pop_id || !amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({ ok: false, message: "pop_id and positive amount required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pop, error: popErr } = await supabase
      .from("branch_managers")
      .select("id, name, branch_id, contact, phone")
      .eq("id", pop_id)
      .maybeSingle();
    if (popErr || !pop) {
      return new Response(JSON.stringify({ ok: false, message: "POP not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rec, error: recErr } = await supabase
      .from("pop_fund_recharges")
      .insert({
        pop_id: pop.id,
        branch_id: pop.branch_id,
        amount: Number(amount),
        method: gateway,
        status: "pending",
        note: `POP self-recharge via ${gateway}`,
      })
      .select("id")
      .single();
    if (recErr || !rec) throw new Error(recErr?.message || "Failed to create recharge row");

    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
    const callback = `${fnBase}/payment-callback?gateway=${gateway}&pop_recharge_id=${rec.id}`;

    if (gateway === "bkash") {
      const r = await fetch(`${fnBase}/bkash-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          action: "create",
          amount: Number(amount),
          callback_url: callback,
          request_id: rec.id,
          payer_reference: payer_reference || pop.contact || pop.phone || "01",
        }),
      });
      const data = await r.json();
      const url = data?.bkashURL;
      if (!url) {
        await supabase.from("pop_fund_recharges").update({
          status: "failed",
          gateway_response: data,
        }).eq("id", rec.id);
        return new Response(JSON.stringify({ ok: false, message: data?.statusMessage || "bKash URL missing", detail: data }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("pop_fund_recharges").update({
        gateway_payment_id: data.paymentID || null,
        gateway_response: data,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, recharge_id: rec.id, redirect_url: url, paymentID: data.paymentID }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, message: `Gateway ${gateway} not supported yet` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("pop-fund-recharge error", e);
    return new Response(JSON.stringify({ ok: false, message: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
