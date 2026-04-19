// Improved user-to-ONU mapping using OLT MAC table + port_type filtering.
// Logic:
// 1. Fetch all unmapped (or all) user_onu_mapping rows with caller_id_mac.
// 2. For each user MAC, look up matches in olt_mac_table WHERE port_type='access_pon'.
// 3. If exactly one access match → confident map (mac+port).
// 4. If multiple access matches → mark as ambiguous (mac_only_ambiguous).
// 5. Cross-reference onu_list by mac to attach onu_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull all user mappings that have a MAC
    const { data: users, error: uErr } = await supabase
      .from("user_onu_mapping")
      .select("id, ppp_username, caller_id_mac, status")
      .not("caller_id_mac", "is", null);
    if (uErr) throw uErr;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull entire MAC table once
    const { data: macRows, error: mErr } = await supabase
      .from("olt_mac_table")
      .select("olt_id, mac, port, port_type");
    if (mErr) throw mErr;

    // Index MAC table by normalized mac
    const byMac = new Map<string, { olt_id: string; port: string; port_type: string }[]>();
    (macRows || []).forEach((r) => {
      const key = r.mac.toLowerCase();
      if (!byMac.has(key)) byMac.set(key, []);
      byMac.get(key)!.push(r);
    });

    // Pull onu_list to cross-link
    const { data: onus } = await supabase.from("onu_list").select("id, mac, olt_id");
    const onuByMacOlt = new Map<string, string>();
    (onus || []).forEach((o) => {
      if (o.mac) onuByMacOlt.set(`${o.mac.toLowerCase()}|${o.olt_id}`, o.id);
    });

    let mapped = 0, ambiguous = 0, unmapped = 0;

    for (const u of users) {
      const userMac = (u.caller_id_mac || "").toLowerCase();
      if (!userMac) continue;

      const allMatches = byMac.get(userMac) || [];
      // Filter only access PON ports — uplink/trunk MAC leakage is excluded
      const accessMatches = allMatches.filter((m) => m.port_type === "access_pon");

      let updates: any = { match_method: "unmapped", onu_id: null, pon_port: null };

      if (accessMatches.length === 1) {
        const m = accessMatches[0];
        const onuId = onuByMacOlt.get(`${userMac}|${m.olt_id}`) || null;
        updates = {
          match_method: "mac+port",
          onu_id: onuId,
          pon_port: m.port,
          status: onuId ? "mapped" : "unmapped",
          mapped_at: onuId ? new Date().toISOString() : null,
        };
        if (onuId) mapped++; else unmapped++;
      } else if (accessMatches.length > 1) {
        // Multiple access ports across different OLTs (e.g., trunk/sharing)
        updates = { match_method: "mac_only_ambiguous", status: "unmapped" };
        ambiguous++;
      } else {
        // No access-port match. Fall back to any match for visibility.
        if (allMatches.length > 0) {
          updates = { match_method: "uplink_only", status: "unmapped", pon_port: allMatches[0].port };
        }
        unmapped++;
      }

      await supabase.from("user_onu_mapping").update(updates).eq("id", u.id);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: users.length, mapped, ambiguous, unmapped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
