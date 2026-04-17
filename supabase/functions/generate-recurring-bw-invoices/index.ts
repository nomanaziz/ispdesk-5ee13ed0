// Generate recurring Bandwidth Sale invoices for the current month.
// Runs idempotently: uses last_generated_month to avoid duplicates.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;
    const periodStart = `${monthStr}-01`;
    const periodEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate();

    const { data: templates, error: tErr } = await supabase
      .from("bw_sale_recurring_invoices")
      .select("*")
      .eq("status", "enabled")
      .lte("start_date", periodEnd);
    if (tErr) throw tErr;

    let generated = 0;
    const results: any[] = [];

    for (const tpl of templates || []) {
      // Skip if outside range, already generated, or repeat day not yet hit
      if (tpl.end_date && tpl.end_date < periodStart) continue;
      if (tpl.last_generated_month === monthStr) continue;
      if (Number(tpl.repeat_day) > day) continue;

      const { data: items } = await supabase
        .from("bw_sale_recurring_items")
        .select("*")
        .eq("recurring_id", tpl.id)
        .order("sort_order");
      if (!items || items.length === 0) continue;

      let total = 0;
      const invItems = items.map((it: any, i: number) => {
        const amount = Number(it.quantity) * Number(it.rate) * (1 + Number(it.vat_pct || 0) / 100);
        total += amount;
        return {
          item_id: it.item_id, service_id: it.item_id,
          item_name: it.item_name, service_name: it.item_name,
          description: it.description, unit: it.unit,
          quantity: it.quantity, bandwidth_mbps: it.quantity,
          rate: it.rate, vat_pct: it.vat_pct,
          from_date: periodStart, to_date: periodEnd,
          period_start: periodStart, period_end: periodEnd,
          days: totalDays, total_days_in_month: totalDays,
          amount: Math.round(amount * 100) / 100, sort_order: i,
        };
      });

      const dueDate = new Date(Date.UTC(y, m - 1, day + Number(tpl.payment_due_days || 7))).toISOString().slice(0, 10);
      const invoiceNo = `BW-R-${Date.now().toString().slice(-8)}-${tpl.id.slice(0, 4)}`;

      const { data: inv, error: iErr } = await supabase.from("bw_sales_invoices").insert({
        invoice_no: invoiceNo,
        customer_id: tpl.customer_id,
        month: monthStr, billing_month: monthStr,
        period_start: periodStart, period_end: periodEnd,
        payment_due_date: dueDate,
        amount: Math.round(total * 100) / 100,
        total_amount: Math.round(total * 100) / 100,
        discount: 0, paid_amount: 0, due: Math.round(total * 100) / 100,
        status: "unpaid",
        remarks: `Auto-generated from recurring template ${tpl.id}`,
      }).select().single();
      if (iErr) { results.push({ tpl: tpl.id, error: iErr.message }); continue; }

      const itemsWithInv = invItems.map(x => ({ ...x, invoice_id: inv.id }));
      await supabase.from("bw_invoice_items").insert(itemsWithInv);
      await supabase.from("bw_sale_recurring_invoices").update({ last_generated_month: monthStr }).eq("id", tpl.id);
      generated++;
      results.push({ tpl: tpl.id, invoice: inv.invoice_no });
    }

    return new Response(JSON.stringify({ generated, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
