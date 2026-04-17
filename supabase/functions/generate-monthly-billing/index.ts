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

    // Determine target month (default: current month)
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

    const monthKey = targetMonth.slice(0, 7); // "YYYY-MM"

    // Fetch all active clients (case-insensitive status)
    const { data: clients, error: cErr } = await supabase
      .from("clients")
      .select("id, client_id, monthly_bill, branch_id, billing_status, status")
      .or("status.eq.active,status.eq.Active,status.eq.ACTIVE");

    if (cErr) throw cErr;
    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active clients found", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find which clients already have billing for this month
    const clientIds = clients.map((c: any) => c.id);
    const { data: existingBills } = await supabase
      .from("billing")
      .select("client_id")
      .eq("month", targetMonth)
      .in("client_id", clientIds);

    const existingSet = new Set((existingBills || []).map((b: any) => b.client_id));

    // Categorize and build new bills with rules
    let skippedPersonal = 0;
    let skippedLeft = 0;
    let skippedExisting = 0;
    let freeBills = 0;
    let normalBills = 0;

    const newBills: any[] = [];

    for (const c of clients as any[]) {
      const bs = String(c.billing_status || "").toLowerCase();

      if (existingSet.has(c.id)) {
        skippedExisting++;
        continue;
      }
      if (bs === "left" || bs === "inactive") {
        skippedLeft++;
        continue;
      }
      if (bs === "personal") {
        skippedPersonal++;
        continue;
      }

      const isFree = bs === "free";
      const amount = isFree ? 500 : Number(c.monthly_bill || 0);
      const paid = isFree ? 500 : 0;
      const due = isFree ? 0 : amount;
      const status = isFree ? "paid" : "unpaid";

      newBills.push({
        bill_id: `BILL-${c.client_id}-${monthKey}`,
        client_id: c.id,
        month: targetMonth,
        amount,
        paid,
        due,
        status,
        generated: true,
        branch_id: c.branch_id || null,
        pay_date: isFree ? new Date().toISOString().slice(0, 10) : null,
      });

      if (isFree) freeBills++;
      else normalBills++;
    }

    if (newBills.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No new bills to generate",
          generated: 0,
          skippedPersonal,
          skippedLeft,
          skippedExisting,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert in batches of 100
    let inserted = 0;
    for (let i = 0; i < newBills.length; i += 100) {
      const batch = newBills.slice(i, i + 100);
      const { error: insErr } = await supabase.from("billing").insert(batch);
      if (insErr) {
        console.error(`Batch insert error at ${i}:`, insErr);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${inserted} bills for ${monthKey}`,
        generated: inserted,
        normalBills,
        freeBills,
        skippedPersonal,
        skippedLeft,
        skippedExisting,
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
