import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* allow empty */ }

    const today = (body?.date as string) || new Date().toISOString().slice(0, 10);

    // Fetch all funded POPs (prepaid wallet model)
    const { data: pops, error: popsErr } = await sb
      .from("branch_managers")
      .select("id, name, branch_id, balance, fund_started, pop_type")
      .eq("fund_started", true);
    if (popsErr) throw popsErr;

    let totalCharged = 0;
    let totalRows = 0;
    const popResults: any[] = [];

    for (const pop of pops ?? []) {
      if (!pop.branch_id) continue;

      // Fetch active clients for this POP
      const { data: clients, error: cErr } = await sb
        .from("clients")
        .select(`
          id, name, username, billing_status, monthly_bill, package_id, branch_id,
          auto_recharge_enabled, expire_date, mikrotik_id,
          isp_packages:package_id ( name, mikrotik_profile, protocol_type, mikrotik_server_id ),
          zones:zone_id ( id, name ),
          sub_zones:sub_zone_id ( id, name )
        `)
        .eq("branch_id", pop.branch_id)
        .in("billing_status", ["active", "enabled"]);
      if (cErr) {
        popResults.push({ pop: pop.name, error: cErr.message });
        continue;
      }

      let runningBalance = Number(pop.balance) || 0;
      const inserts: any[] = [];
      const toDisable: string[] = [];

      for (const c of clients ?? []) {
        const monthly = Number((c as any).monthly_bill) || 0;
        if (monthly <= 0) continue;
        const daily = Math.round((monthly / 30) * 100) / 100;
        if (daily <= 0) continue;

        // Expired client সর্বদা disable (auto on/off নির্বিশেষে)। Recharge হলে expire_date push হয়, তখন আর expired থাকবে না।
        const expDate = (c as any).expire_date as string | null;
        const expired = expDate ? expDate <= today : false;
        if (expired) {
          toDisable.push((c as any).id);
          continue;
        }

        // Strict prepaid: stop and disable when wallet can't cover today's daily cost
        if (runningBalance < daily) {
          toDisable.push((c as any).id);
          continue;
        }

        const before = runningBalance;
        const after = before - daily;
        runningBalance = after;

        const pkg: any = (c as any).isp_packages;
        const zone: any = (c as any).zones;
        const subZone: any = (c as any).sub_zones;

        let serverName: string | null = null;
        if (pkg?.mikrotik_server_id) {
          const { data: srv } = await sb
            .from("mikrotik_devices")
            .select("name")
            .eq("id", pkg.mikrotik_server_id)
            .maybeSingle();
          serverName = srv?.name ?? null;
        }

        inserts.push({
          pop_id: pop.id,
          branch_id: pop.branch_id,
          client_id: c.id,
          client_username: (c as any).username,
          client_name: (c as any).name,
          package_id: (c as any).package_id,
          package_name: pkg?.name ?? null,
          profile: pkg?.mikrotik_profile ?? null,
          protocol_type: pkg?.protocol_type ?? null,
          server_id: pkg?.mikrotik_server_id ?? null,
          server_name: serverName,
          zone_id: zone?.id ?? null,
          zone_name: zone?.name ?? null,
          sub_zone_id: subZone?.id ?? null,
          sub_zone_name: subZone?.name ?? null,
          monthly_rate: monthly,
          daily_rate: daily,
          charged_amount: daily,
          pop_balance_before: before,
          pop_balance_after: after,
          charge_date: today,
          charged_by: "system-cron",
        });
      }

      // Suspend clients we couldn't charge today (insufficient wallet)
      if (toDisable.length > 0) {
        await sb.from("clients").update({ mikrotik_status: "disabled" }).in("id", toDisable);
      }

      if (inserts.length === 0) {
        popResults.push({ pop: pop.name, charged: 0, users: 0, suspended: toDisable.length });
        continue;
      }

      const { data: inserted, error: insErr } = await sb
        .from("pop_daily_charges")
        .upsert(inserts, { onConflict: "pop_id,client_id,charge_date", ignoreDuplicates: true })
        .select("charged_amount");

      if (insErr) {
        popResults.push({ pop: pop.name, error: insErr.message });
        continue;
      }

      const popCharged = (inserted ?? []).reduce((s, r: any) => s + (Number(r.charged_amount) || 0), 0);
      const newBal = (Number(pop.balance) || 0) - popCharged;

      if (popCharged > 0) {
        await sb.from("branch_managers").update({ balance: newBal }).eq("id", pop.id);
      }

      totalCharged += popCharged;
      totalRows += inserted?.length ?? 0;
      popResults.push({ pop: pop.name, charged: popCharged, users: inserted?.length ?? 0, suspended: toDisable.length });
    }

    return new Response(
      JSON.stringify({ ok: true, date: today, totalCharged, totalRows, popResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("apply-pop-daily-charges error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
