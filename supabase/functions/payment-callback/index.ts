import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "";

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url, ...corsHeaders } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const gateway = url.searchParams.get("gateway") || "";
  const requestId = url.searchParams.get("request_id") || "";
  let status = url.searchParams.get("status") || "";
  let trxId = url.searchParams.get("trxID") || url.searchParams.get("tran_id") || "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Form-POST callback (e.g. SSLCommerz IPN)
  let formData: Record<string, any> = {};
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      fd.forEach((v, k) => { formData[k] = v.toString(); });
      status = formData.status || status;
      trxId = formData.tran_id || trxId;
    }
  }

  // Load payment request
  const { data: pr } = await supabase.from("public_payment_requests")
    .select("*, clients(name)").eq("id", requestId).maybeSingle();

  const portalUrl = (s: string) => {
    const base = APP_URL || `${url.protocol}//${url.host.replace(/\.functions\..*/, ".lovable.app")}`;
    const billPart = pr?.billing_id ? `/portal/bill/${pr.billing_id}` : `/portal/bills`;
    return `${base}${billPart}?payment=${s}`;
  };

  if (!pr) return redirect(portalUrl("failed"));

  let verified = false;
  let gatewayData: any = formData;

  try {
    if (gateway === "bkash" && status === "success") {
      const paymentID = url.searchParams.get("paymentID") || "";
      const ex = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/bkash-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({ action: "execute", paymentID }),
      });
      gatewayData = await ex.json();
      verified = gatewayData.statusCode === "0000" || gatewayData.transactionStatus === "Completed";
      trxId = gatewayData.trxID || trxId;
    } else if (gateway === "sslcommerz" && (status === "VALID" || status === "VALIDATED" || formData.status === "VALID")) {
      const val = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sslcommerz-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({ action: "validate", val_id: formData.val_id || url.searchParams.get("val_id") }),
      });
      gatewayData = await val.json();
      verified = gatewayData.status === "VALID" || gatewayData.status === "VALIDATED";
      trxId = gatewayData.bank_tran_id || gatewayData.tran_id || trxId;
    } else if (gateway === "rechargeserver" && status === "success") {
      const v = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/rechargeserver-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({ action: "verify", transaction_id: trxId }),
      });
      gatewayData = await v.json();
      verified = !!gatewayData.status;
    } else if (gateway === "nagad" && status === "Success") {
      verified = true; // Nagad verify TODO once keys provided
    }
  } catch (e) {
    console.error("verify error", e);
  }

  if (!verified) {
    await supabase.from("public_payment_requests").update({
      status: "failed", gateway_response: gatewayData, trx_id: trxId || pr.trx_id,
    }).eq("id", pr.id);
    return redirect(portalUrl("failed"));
  }

  // Mark approved + create bill_collection + update billing
  await supabase.from("public_payment_requests").update({
    status: "approved", gateway_response: gatewayData, trx_id: trxId,
    approved_at: new Date().toISOString(),
  }).eq("id", pr.id);

  if (pr.billing_id) {
    const { data: bill } = await supabase.from("billing").select("*").eq("id", pr.billing_id).maybeSingle();
    if (bill) {
      const newPaid = Number(bill.paid || 0) + Number(pr.amount);
      const newDue = Math.max(0, Number(bill.amount || 0) - newPaid);
      await supabase.from("billing").update({
        paid: newPaid, due: newDue,
        status: newDue <= 0 ? "paid" : "partial",
        pay_date: new Date().toISOString().slice(0, 10),
        payment_method: gateway,
      }).eq("id", bill.id);

      await supabase.from("bill_collections").insert({
        billing_id: bill.id,
        client_id: pr.client_id,
        amount: pr.amount,
        payment_method: gateway,
        transaction_id: trxId,
        note: `Online payment via ${gateway}`,
        status: "approved",
      });
    }
  }

  return redirect(portalUrl("success"));
});
