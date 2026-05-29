// Auto-Suspension Scheduler — checks system_settings.auto_suspension config:
//   { enabled: bool, grace_days: int, sms_enabled: bool, template_key: string }
// Disables overdue clients on MikroTik & sends SMS via send-notification.
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

    // Load auto-suspension settings (default values if not configured)
    const { data: settingRow } = await sb
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "auto_suspension")
      .maybeSingle();

    const cfg = (settingRow?.setting_value as any) ?? {};
    const enabled = cfg.enabled !== false; // default true (backward compatible)
    const graceDays = Number.isFinite(cfg.grace_days) ? Number(cfg.grace_days) : 0;
    const smsEnabled = cfg.sms_enabled === true;
    const templateKey = cfg.template_key || "suspension_notice";
    const dryRun = cfg.dry_run === true;

    if (!enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "auto_suspension disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // cutoff = today - grace_days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data: rows, error } = await sb
      .from("clients")
      .select("id, mikrotik_id, username, mobile, full_name, expire_date, mikrotik_status, billing_status, is_vip")
      .lt("expire_date", cutoffStr)
      .eq("mikrotik_status", "enabled")
      .not("mikrotik_id", "is", null)
      .neq("is_vip", true)
      .not("billing_status", "in", "(VIP,Personal,Free,vip,personal,free)");
    if (error) throw error;

    const list = (rows ?? []) as any[];
    const ids = list.map((r) => r.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, disabled: 0, grace_days: graceDays }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, would_disable: ids.length, sample: list.slice(0, 5) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("clients").update({ mikrotik_status: "disabled" }).in("id", ids);

    let pushed = 0, failed = 0, notified = 0;
    for (const r of list) {
      if (!r.mikrotik_id || !r.username) continue;
      try {
        const res = await fetch(`${url}/functions/v1/manage-mikrotik-ppp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ mikrotik_id: r.mikrotik_id, username: r.username, client_id: r.id, action: "disable" }),
        });
        if (res.ok) pushed++; else failed++;
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
              },
            }),
          });
          if (nres.ok) notified++;
        } catch { /* ignore */ }
      }
    }

    return new Response(JSON.stringify({ ok: true, disabled: ids.length, pushed, failed, notified, grace_days: graceDays }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enforce-expired-disable error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
