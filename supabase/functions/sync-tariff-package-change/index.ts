// Sync clients to a new MikroTik server/profile when a tariff package row is updated.
// Triggered by the Tariff UI after a server/profile change is saved.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tariff_package_id, dry_run } = await req.json();
    if (!tariff_package_id) {
      return new Response(
        JSON.stringify({ error: "tariff_package_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Load tariff package row
    const { data: tp, error: tpErr } = await supabase
      .from("reseller_tariff_packages")
      .select("id, tariff_id, package_id, mikrotik_server_id, mikrotik_profile, protocol_type")
      .eq("id", tariff_package_id)
      .single();
    if (tpErr || !tp) throw new Error(tpErr?.message || "Tariff package not found");

    // 2. Find all POPs (branch_managers) assigned to this tariff
    const { data: pops, error: popsErr } = await supabase
      .from("branch_managers")
      .select("id")
      .eq("tariff_id", tp.tariff_id);
    if (popsErr) throw popsErr;
    const popIds = (pops ?? []).map((p: any) => p.id);

    if (popIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          affected_clients: 0,
          message: "No POPs assigned to this tariff",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Find clients of those POPs that use this package
    const { data: clients, error: clErr } = await supabase
      .from("clients")
      .select("id, name, username, password, mikrotik_server_id")
      .in("branch_manager_id", popIds)
      .eq("package_id", tp.package_id);
    if (clErr) throw clErr;

    const affected = clients ?? [];

    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          affected_clients: affected.length,
          target_server: tp.mikrotik_server_id,
          target_profile: tp.mikrotik_profile,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. For each client, recreate on new server (best-effort, non-blocking errors)
    const results: any[] = [];
    for (const c of affected) {
      try {
        // Remove from old server if different
        if (c.mikrotik_server_id && c.mikrotik_server_id !== tp.mikrotik_server_id) {
          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              action: "remove",
              device_id: c.mikrotik_server_id,
              username: c.username,
            },
          }).catch((e) => console.error(`remove failed for ${c.username}`, e));
        }

        // Create on new server
        if (tp.mikrotik_server_id) {
          const { error: createErr } = await supabase.functions.invoke(
            "create-mikrotik-ppp",
            {
              body: {
                device_id: tp.mikrotik_server_id,
                username: c.username,
                password: c.password,
                profile: tp.mikrotik_profile,
                service: (tp.protocol_type || "pppoe").toLowerCase(),
              },
            },
          );
          if (createErr) throw createErr;
        }

        // Update client row
        await supabase
          .from("clients")
          .update({ mikrotik_server_id: tp.mikrotik_server_id })
          .eq("id", c.id);

        results.push({ client_id: c.id, status: "ok" });
      } catch (e: any) {
        results.push({ client_id: c.id, status: "error", error: e.message });
      }
    }

    const okCount = results.filter((r) => r.status === "ok").length;

    return new Response(
      JSON.stringify({
        success: true,
        affected_clients: affected.length,
        synced: okCount,
        failed: affected.length - okCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sync-tariff-package-change error", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
