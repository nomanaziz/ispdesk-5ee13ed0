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
  const popRechargeId = url.searchParams.get("pop_recharge_id") || "";
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

  // ---------- POP self-service fund recharge flow ----------
  if (popRechargeId) {
    const { data: rec } = await supabase.from("pop_fund_recharges")
      .select("*, branch_managers(id, name, branch_id)")
      .eq("id", popRechargeId).maybeSingle();

    const popPortal = (s: string) => {
      const base = APP_URL || `${url.protocol}//${url.host.replace(/\.functions\..*/, ".lovable.app")}`;
      return `${base}/pop-admin/fund-history/debit?recharge=${s}`;
    };
    if (!rec) return redirect(popPortal("failed"));

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
          body: JSON.stringify({ action: "validate", val_id: formData.val_id, tran_id: formData.tran_id || trxId }),
        });
        gatewayData = await val.json();
        verified = gatewayData.status === "VALID" || gatewayData.status === "VALIDATED";
        trxId = gatewayData.bank_tran_id || gatewayData.tran_id || trxId;
      } else if (gateway === "rechargeserver" && status === "success") {
        const v = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/rechargeserver-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
          body: JSON.stringify({ action: "verify", invoice_id: url.searchParams.get("invoice_id") || formData.invoice_id, transaction_id: url.searchParams.get("transaction_id") || formData.transaction_id }),
        });
        gatewayData = await v.json();
        verified = !!gatewayData.status;
        trxId = gatewayData.transaction_id || trxId;
      } else if (gateway === "nagad" && (status === "Success" || status === "success")) {
        const paymentRef = url.searchParams.get("payment_ref_id") || url.searchParams.get("paymentRefId") || "";
        const v = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/nagad-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
          body: JSON.stringify({ action: "verify", payment_ref_id: paymentRef }),
        });
        gatewayData = await v.json();
        verified = gatewayData.status === "Success" || gatewayData.statusCode === "000";
        trxId = gatewayData.issuerPaymentRefNo || gatewayData.paymentRefId || trxId;
      }
    } catch (e) { console.error("pop recharge verify error", e); }

    if (!verified) {
      await supabase.from("pop_fund_recharges").update({
        status: "failed", gateway_response: gatewayData, trx_id: trxId || rec.trx_id,
      }).eq("id", rec.id);
      return redirect(popPortal("failed"));
    }

    // Insert into branch_funding (trigger will credit pop balance)
    const { data: fund, error: fundErr } = await supabase.from("branch_funding").insert({
      branch_id: rec.branch_id,
      amount: rec.amount,
      received_amount: rec.amount,
      due_amount: 0,
      discount: 0,
      vat: 0,
      processing_fee: 0,
      payment_method: gateway,
      trans_type: "fund",
      status: "paid",
      funding_date: new Date().toISOString().slice(0, 10),
      received_on: new Date().toISOString().slice(0, 10),
      type: "online",
      remarks: `POP online recharge — ${gateway} TrxID ${trxId}`,
    }).select("id").maybeSingle();
    if (fundErr) console.error("branch_funding insert failed", fundErr);

    await supabase.from("pop_fund_recharges").update({
      status: "approved",
      gateway_response: gatewayData,
      trx_id: trxId,
      funding_id: fund?.id ?? null,
      approved_at: new Date().toISOString(),
    }).eq("id", rec.id);

    return redirect(popPortal("success"));
  }

  // Load payment request (client bill flow)
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

      // Record reseller PGW share + auto-settle if POP opted-in
      try {
        const { data: client } = await supabase.from("clients")
          .select("id, name, contact, branch_id, monthly_bill")
          .eq("id", pr.client_id).maybeSingle();
        if (client?.branch_id) {
          const { data: pop } = await supabase.from("branch_managers")
            .select("id, auto_settle_pgw, tariff_id")
            .eq("branch_id", client.branch_id).maybeSingle();
          let tariffRate = 0;
          if (pop?.tariff_id) {
            const { data: tp } = await supabase.from("reseller_tariff_packages")
              .select("package_rate").eq("tariff_id", pop.tariff_id).limit(1).maybeSingle();
            tariffRate = Number(tp?.package_rate || 0);
          }
          const ourShare = Math.min(tariffRate || Number(pr.amount), Number(pr.amount));
          const resellerShare = Math.max(0, Number(pr.amount) - ourShare);
          const { data: pgwRow } = await supabase.from("reseller_pgw_payments").insert({
            reseller_id: pop?.id ?? null,
            client_name: client.name,
            client_contact: client.contact,
            total_amount: pr.amount,
            our_share: ourShare,
            reseller_share: resellerShare,
            tariff_rate: tariffRate,
            payment_method: gateway,
            transaction_id: trxId,
            status: "completed",
          }).select("id").maybeSingle();

          if (pop?.auto_settle_pgw && pop?.id && ourShare > 0) {
            await supabase.from("reseller_pgw_settlements").insert({
              reseller_id: pop.id,
              amount: ourShare,
              method: gateway,
              settlement_type: "auto",
              reference: trxId,
              notes: `Auto-settled from online payment ${trxId}`,
              payment_date: new Date().toISOString().slice(0, 10),
              status: "completed",
              pgw_payment_ids: pgwRow?.id ? [pgwRow.id] : null,
            });
          }
        }
      } catch (e) {
        console.error("PGW share record failed", e);
      }

      // Auto re-enable client on MikroTik after successful payment
      if (newDue <= 0 && pr.client_id) {
        try {
          const { data: client } = await supabase.from("clients")
            .select("id, mikrotik_id, username, billing_status")
            .eq("id", pr.client_id).maybeSingle();
          if (client?.mikrotik_id && client?.username) {
            await supabase.from("clients").update({
              billing_status: "Active",
              mikrotik_status: "enabled",
            }).eq("id", client.id);
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-mikrotik-ppp`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
              body: JSON.stringify({
                client_id: client.id,
                mikrotik_id: client.mikrotik_id,
                username: client.username,
                action: "update",
                disabled: false,
              }),
            });
          }
        } catch (e) {
          console.error("auto re-enable failed", e);
        }
      }
    }
  }

  return redirect(portalUrl("success"));
});
