import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read cycle config
    const { data: cfgRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "billing_cycle_config")
      .maybeSingle();

    const cfg: any = cfgRow?.setting_value || { mode: "monthly_first", grace_days: 15 };

    // Determine target month
    let targetMonth: string | null = null;
    try {
      const body = await req.json();
      targetMonth = body?.month || null;
    } catch {
      targetMonth = null;
    }
    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    const monthKey = targetMonth.slice(0, 7);

    // Fetch active clients
    const { data: clients, error: cErr } = await supabase
      .from("clients")
      .select("id, client_id, monthly_bill, branch_id, billing_status, status")
      .or("status.eq.active,status.eq.Active,status.eq.ACTIVE");

    if (cErr) throw cErr;
    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active clients found", generated: 0, mode: cfg.mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find existing bills for the month (idempotency)
    const clientIds = clients.map((c: any) => c.id);
    const { data: existingBills } = await supabase
      .from("billing")
      .select("client_id, bill_id")
      .eq("month", targetMonth)
      .in("client_id", clientIds);

    const existingByClient = new Set((existingBills || []).map((b: any) => b.client_id));
    const existingBillIds = new Set((existingBills || []).map((b: any) => b.bill_id));

    let skippedPersonal = 0, skippedLeft = 0, skippedExisting = 0;
    let freeBills = 0, normalBills = 0;
    const newBills: any[] = [];

    // Compute due_date with grace
    const graceDays = Number(cfg.grace_days || 15);
    const dueDate = new Date(targetMonth);
    dueDate.setDate(dueDate.getDate() + graceDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    for (const c of clients as any[]) {
      const bs = String(c.billing_status || "").toLowerCase();
      if (existingByClient.has(c.id)) { skippedExisting++; continue; }
      if (bs === "left" || bs === "inactive") { skippedLeft++; continue; }
      if (bs === "personal") { skippedPersonal++; continue; }

      const isFree = bs === "free";
      const amount = isFree ? 500 : Number(c.monthly_bill || 0);
      const paid = isFree ? 500 : 0;
      const due = isFree ? 0 : amount;
      const status = isFree ? "paid" : "unpaid";
      const billId = `BILL-${c.client_id}-${monthKey}`;

      if (existingBillIds.has(billId)) { skippedExisting++; continue; }

      newBills.push({
        bill_id: billId,
        client_id: c.id,
        month: targetMonth,
        amount,
        paid,
        due,
        status,
        generated: true,
        branch_id: c.branch_id || null,
        due_date: dueDateStr,
        pay_date: isFree ? new Date().toISOString().slice(0, 10) : null,
      });

      if (isFree) freeBills++; else normalBills++;
    }

    if (newBills.length === 0) {
      return new Response(
        JSON.stringify({
          message: `No new bills to generate for ${monthKey}`,
          generated: 0, mode: cfg.mode,
          skippedPersonal, skippedLeft, skippedExisting,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert in batches; on conflict (unique bill_id) skip silently
    let inserted = 0;
    for (let i = 0; i < newBills.length; i += 100) {
      const batch = newBills.slice(i, i + 100);
      const { error: insErr, count } = await supabase
        .from("billing")
        .upsert(batch, { onConflict: "bill_id", ignoreDuplicates: true, count: "exact" } as any);
      if (insErr) {
        console.error(`Batch upsert error at ${i}:`, insErr);
      } else {
        inserted += count ?? batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${inserted} bills for ${monthKey} (${cfg.mode})`,
        generated: inserted, mode: cfg.mode,
        normalBills, freeBills, skippedPersonal, skippedLeft, skippedExisting,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-monthly-billing error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
