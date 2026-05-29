// Auto-Suspension Scheduler — checks system_settings.auto_suspension config:
//   {
//     enabled: bool, grace_days: int, sms_enabled: bool, template_key: string,
//     mode: "disable" | "block_profile",
//     block_profile_name: string,
//   }
// Per-POP override via branch_managers.suspension_mode + block_profile_name.
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

    const { data: settingRow } = await sb
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "auto_suspension")
      .maybeSingle();

    const cfg = (settingRow?.setting_value as any) ?? {};
    const enabled = cfg.enabled !== false;
    const graceDays = Number.isFinite(cfg.grace_days) ? Number(cfg.grace_days) : 0;
    const smsEnabled = cfg.sms_enabled === true;
    const templateKey = cfg.template_key || "suspension_notice";
    const dryRun = cfg.dry_run === true;
    const globalMode: "disable" | "block_profile" = cfg.mode === "block_profile" ? "block_profile" : "disable";
    const globalBlockProfile: string = (cfg.block_profile_name || "block-profile").trim();

    if (!enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "auto_suspension disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data: rows, error } = await sb
      .from("clients")
      .select("id, mikrotik_id, username, mobile, full_name, expire_date, mikrotik_status, billing_status, is_vip, branch_id, profile, original_profile")
      .lt("expire_date", cutoffStr)
      .eq("mikrotik_status", "enabled")
      .not("mikrotik_id", "is", null)
      .neq("is_vip", true)
      .not("billing_status", "in", "(VIP,Personal,Free,vip,personal,free)");
    if (error) throw error;

    const list = (rows ?? []) as any[];
    if (list.length === 0) {
      return new Response(JSON.stringify({ ok: true, disabled: 0, blocked: 0, grace_days: graceDays }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load per-POP overrides for involved branches
    const branchIds = Array.from(new Set(list.map((r) => r.branch_id).filter(Boolean)));
    const popOverrides: Record<string, { mode: string; block_profile_name: string | null }> = {};
    if (branchIds.length) {
      const { data: pops } = await sb
        .from("branch_managers")
        .select("branch_id, suspension_mode, block_profile_name")
        .in("branch_id", branchIds);
      for (const p of pops ?? []) {
        popOverrides[(p as any).branch_id] = {
          mode: (p as any).suspension_mode || "inherit",
          block_profile_name: (p as any).block_profile_name,
        };
      }
    }

    const effectiveFor = (r: any): { mode: "disable" | "block_profile"; profile: string } => {
      const ov = r.branch_id ? popOverrides[r.branch_id] : null;
      let mode: "disable" | "block_profile" = globalMode;
      let profile = globalBlockProfile;
      if (ov && ov.mode && ov.mode !== "inherit") {
        mode = ov.mode === "block_profile" ? "block_profile" : "disable";
        if (mode === "block_profile" && ov.block_profile_name) profile = ov.block_profile_name;
      }
      return { mode, profile };
    };

    if (dryRun) {
      const preview = list.slice(0, 10).map((r) => ({ id: r.id, username: r.username, ...effectiveFor(r) }));
      return new Response(JSON.stringify({ ok: true, dry_run: true, would_affect: list.length, sample: preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let disabledCount = 0, blockedCount = 0, pushed = 0, failed = 0, notified = 0;

    for (const r of list) {
      if (!r.mikrotik_id || !r.username) continue;
      const eff = effectiveFor(r);

      try {
        if (eff.mode === "block_profile") {
          // Save current profile (only if not already blocked)
          const orig = r.original_profile || r.profile || null;
          await sb.from("clients").update({
            original_profile: orig,
            billing_status: "Blocked",
            profile: eff.profile,
          }).eq("id", r.id);

          const res = await fetch(`${url}/functions/v1/manage-mikrotik-ppp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              mikrotik_id: r.mikrotik_id,
              username: r.username,
              client_id: r.id,
              action: "update",
              profile: eff.profile,
              disabled: false,
            }),
          });
          if (res.ok) { pushed++; blockedCount++; } else { failed++; }
        } else {
          await sb.from("clients").update({ mikrotik_status: "disabled" }).eq("id", r.id);
          const res = await fetch(`${url}/functions/v1/manage-mikrotik-ppp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              mikrotik_id: r.mikrotik_id,
              username: r.username,
              client_id: r.id,
              action: "disable",
            }),
          });
          if (res.ok) { pushed++; disabledCount++; } else { failed++; }
        }
      } catch { failed++; }

      if (smsEnabled && r.mobile) {
        try {
          const nres = await fetch(`${url}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              template_key: templateKey,
              channel: "sms",
              recipient: r.mobile,
              variables: {
                client_name: r.full_name ?? "",
                username: r.username ?? "",
                expire_date: r.expire_date ?? "",
                mode: eff.mode,
              },
            }),
          });
          if (nres.ok) notified++;
        } catch { /* ignore */ }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, disabled: disabledCount, blocked: blockedCount, pushed, failed, notified, grace_days: graceDays }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("enforce-expired-disable error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
