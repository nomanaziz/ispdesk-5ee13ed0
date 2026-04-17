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
    let targetMonth: string;
    try {
      const body = await req.json();
      targetMonth = body.month || null;
    } catch {
      targetMonth = null as any;
    }

    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const monthKey = targetMonth.slice(0, 7); // "YYYY-MM"

    // Fetch all active clients (case-insensitive status)
    const { data: clients, error: cErr } = await supabase
      .from("clients")
      .select("id, client_id, monthly_bill, branch_id, billing_status")
      .or("status.eq.active,status.eq.Active,status.eq.ACTIVE");

    if (cErr) throw cErr;
    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active clients found", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find which clients already have billing for this month
    const clientIds = clients.map(c => c.id);
    const { data: existingBills } = await supabase
      .from("billing")
      .select("client_id")
      .eq("month", targetMonth)
      .in("client_id", clientIds);

    const existingSet = new Set((existingBills || []).map(b => b.client_id));

    // Generate billing for clients without existing bills
    const newBills = clients
      .filter(c => !existingSet.has(c.id) && c.billing_status !== "Left")
      .map(c => ({
        bill_id: `BILL-${c.client_id}-${monthKey}`,
        client_id: c.id,
        month: targetMonth,
        amount: c.monthly_bill || 0,
        due: c.monthly_bill || 0,
        status: "unpaid",
        generated: true,
        branch_id: c.branch_id || null,
      }));

    if (newBills.length === 0) {
      return new Response(
        JSON.stringify({ message: "All clients already have billing for this month", generated: 0 }),
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
      JSON.stringify({ message: `Generated ${inserted} billing records for ${monthKey}`, generated: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-monthly-billing error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
