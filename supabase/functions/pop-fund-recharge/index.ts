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
    const { pop_id, amount, gateway = "bkash", payer_reference, app_origin } = body || {};
    const returnOrigin = (app_origin || req.headers.get("origin") || req.headers.get("referer") || "").replace(/\/+$/, "");
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

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    };
    const failRow = async (data: any, msg: string) => {
      await supabase.from("pop_fund_recharges").update({
        status: "failed", gateway_response: data,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: false, message: msg, detail: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    };

    if (gateway === "bkash") {
      const r = await fetch(`${fnBase}/bkash-payment`, {
        method: "POST",
        headers,
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
      if (!url) return failRow(data, data?.statusMessage || "bKash URL missing");
      await supabase.from("pop_fund_recharges").update({
        gateway_payment_id: data.paymentID || null,
        gateway_response: data,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, recharge_id: rec.id, redirect_url: url, paymentID: data.paymentID }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gateway === "sslcommerz") {
      const tran_id = `POPFUND-${rec.id.slice(0, 8)}-${Date.now()}`;
      const r = await fetch(`${fnBase}/sslcommerz-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          amount: Number(amount),
          tran_id,
          success_url: `${fnBase}/payment-callback?gateway=sslcommerz&pop_recharge_id=${rec.id}&status=VALID`,
          fail_url: `${fnBase}/payment-callback?gateway=sslcommerz&pop_recharge_id=${rec.id}&status=FAILED`,
          cancel_url: `${fnBase}/payment-callback?gateway=sslcommerz&pop_recharge_id=${rec.id}&status=CANCELLED`,
          cus_name: pop.name,
          cus_phone: pop.contact || pop.phone || "01",
          product_name: `POP fund recharge — ${pop.name}`,
          payment_request_id: rec.id,
        }),
      });
      const data = await r.json();
      const url = data?.GatewayPageURL;
      if (!url) return failRow(data, data?.failedreason || "SSLCommerz session failed");
      await supabase.from("pop_fund_recharges").update({
        gateway_payment_id: tran_id,
        gateway_response: data,
        trx_id: tran_id,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, recharge_id: rec.id, redirect_url: url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gateway === "rechargeserver") {
      const r = await fetch(`${fnBase}/rechargeserver-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          amount: Number(amount),
          cus_name: pop.name,
          success_url: `${fnBase}/payment-callback?gateway=rechargeserver&pop_recharge_id=${rec.id}&status=success`,
          cancel_url: `${fnBase}/payment-callback?gateway=rechargeserver&pop_recharge_id=${rec.id}&status=failed`,
          meta_data: { pop_recharge_id: rec.id, pop_id: pop.id },
        }),
      });
      const data = await r.json();
      const url = data?.payment_url || data?.url || data?.data?.payment_url;
      if (!url) return failRow(data, data?.message || "RechargeServer URL missing");
      await supabase.from("pop_fund_recharges").update({
        gateway_payment_id: data?.invoice_id || data?.transaction_id || null,
        gateway_response: data,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, recharge_id: rec.id, redirect_url: url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gateway === "nagad") {
      const r = await fetch(`${fnBase}/nagad-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          amount: Number(amount),
          callback_url: `${fnBase}/payment-callback?gateway=nagad&pop_recharge_id=${rec.id}`,
          request_id: rec.id,
        }),
      });
      const data = await r.json();
      const url = data?.callBackUrl || data?.payment_url || data?.url;
      if (!url) return failRow(data, data?.message || "Nagad URL missing — keys configured?");
      await supabase.from("pop_fund_recharges").update({
        gateway_payment_id: data?.paymentReferenceId || null,
        gateway_response: data,
      }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, recharge_id: rec.id, redirect_url: url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, message: `Gateway ${gateway} not supported` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("pop-fund-recharge error", e);
    return new Response(JSON.stringify({ ok: false, message: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
