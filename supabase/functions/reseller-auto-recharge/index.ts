// Cron: rolls expired clients of resellers with auto_recharge_enabled by 1 day
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const results: any[] = [];

  try {
    const { data: pops, error: popsErr } = await sb
      .from("branch_managers")
      .select("id, name, branch_id, balance, fund_started, auto_recharge_enabled, allow_negative_balance")
      .eq("auto_recharge_enabled", true)
      .eq("fund_started", true);
    if (popsErr) throw popsErr;

    for (const pop of pops ?? []) {
      if (!pop.branch_id) continue;

      // Find clients due: expire_date <= today, mikrotik enabled, per-client auto recharge ON
      const { data: dueClients, error: dErr } = await sb
        .from("clients")
        .select("id, monthly_bill, expire_date, mikrotik_status, status, auto_recharge_enabled")
        .eq("branch_id", pop.branch_id)
        .eq("auto_recharge_enabled", true)
        .lte("expire_date", today)
        .gt("monthly_bill", 0)
        .neq("status", "left")
        .neq("mikrotik_status", "disabled");
      if (dErr) {
        results.push({ pop: pop.name, error: dErr.message });
        continue;
      }

      const ids = (dueClients || []).map((c: any) => c.id);
      if (!ids.length) {
        results.push({ pop: pop.name, due: 0 });
        continue;
      }

      // Renew each eligible client by ONE FULL package cycle. If wallet runs out,
      // disable any client that couldn't be renewed.
      let ok = 0, fail = 0, totalCharged = 0;
      const failures: any[] = [];
      for (const cid of ids) {
        const { data: rpcRes, error: rpcErr } = await sb.rpc("pop_auto_renew_client", { p_client_id: cid });
        if (rpcErr) {
          fail++;
          failures.push({ client_id: cid, error: rpcErr.message });
          if (String(rpcErr.message || "").includes("INSUFFICIENT_BALANCE")) {
            await sb.from("clients").update({ mikrotik_status: "disabled" }).eq("id", cid);
          }
        } else {
          ok++;
          totalCharged += Number((rpcRes as any)?.charged || 0);
        }
      }
      results.push({ pop: pop.name, due: ids.length, succeeded: ok, failed: fail, total_charged: totalCharged, errors: failures });
    }

    return new Response(JSON.stringify({ ok: true, date: today, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
