// Auto-Suspension Scheduler — system_settings.auto_suspension:
//   { enabled, grace_days, sms_enabled, template_key, dry_run,
//     mode: "disable" | "block_profile" }
// Per-MikroTik-server block profile lives in mikrotik_devices.block_profile_name.
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
      .select("id, mikrotik_id, username, mobile, full_name, expire_date, mikrotik_status, billing_status, is_vip, profile, original_profile")
      .lt("expire_date", cutoffStr)
      .eq("mikrotik_status", "enabled")
      .not("mikrotik_id", "is", null)
      .neq("is_vip", true)
      .not("billing_status", "in", "(VIP,Personal,Free,vip,personal,free)");
    if (error) throw error;

    const list = (rows ?? []) as any[];
    if (list.length === 0) {
      return new Response(JSON.stringify({ ok: true, disabled: 0, blocked: 0, skipped_no_profile: 0, grace_days: graceDays }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map mikrotik_id -> block_profile_name
    const mkIds = Array.from(new Set(list.map((r) => r.mikrotik_id).filter(Boolean)));
    const blockProfileByDevice: Record<string, string | null> = {};
    if (mkIds.length) {
      const { data: devs } = await sb
        .from("mikrotik_devices")
        .select("id, block_profile_name")
        .in("id", mkIds);
      for (const d of devs ?? []) {
        blockProfileByDevice[(d as any).id] = (d as any).block_profile_name || null;
      }
    }

    if (dryRun) {
      const preview = list.slice(0, 10).map((r) => ({
        id: r.id,
        username: r.username,
        mode: globalMode,
        block_profile: globalMode === "block_profile" ? blockProfileByDevice[r.mikrotik_id] : null,
      }));
      return new Response(JSON.stringify({ ok: true, dry_run: true, would_affect: list.length, sample: preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let disabledCount = 0, blockedCount = 0, skippedNoProfile = 0, pushed = 0, failed = 0, notified = 0;

    for (const r of list) {
      if (!r.mikrotik_id || !r.username) continue;

      try {
        if (globalMode === "block_profile") {
          const bp = blockProfileByDevice[r.mikrotik_id];
          if (!bp) {
            skippedNoProfile++;
            console.warn(`skip client ${r.id} (${r.username}) — device ${r.mikrotik_id} has no block_profile_name`);
            continue;
          }
          const orig = r.original_profile || r.profile || null;
          await sb.from("clients").update({
            original_profile: orig,
            billing_status: "Blocked",
            profile: bp,
          }).eq("id", r.id);

          const res = await fetch(`${url}/functions/v1/manage-mikrotik-ppp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              mikrotik_id: r.mikrotik_id,
              username: r.username,
              client_id: r.id,
              action: "update",
              profile: bp,
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
                mode: globalMode,
              },
            }),
          });
          if (nres.ok) notified++;
        } catch { /* ignore */ }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, disabled: disabledCount, blocked: blockedCount, skipped_no_profile: skippedNoProfile, pushed, failed, notified, grace_days: graceDays }),
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
