// Lightweight job: প্রতি ১৫ মিনিটে expired + still-enabled clients-দের MikroTik disable করে দেয়।
// daily-charges cron দিনে একবার চলে; এটা intra-day safety net।
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

    const today = new Date().toISOString().slice(0, 10);

    // Expired + currently enabled in DB
    const { data: rows, error } = await sb
      .from("clients")
      .select("id, mikrotik_id, username, expire_date, mikrotik_status")
      .lte("expire_date", today)
      .eq("mikrotik_status", "enabled")
      .not("mikrotik_id", "is", null);
    if (error) throw error;

    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, disabled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update DB rows first (single batch)
    await sb.from("clients").update({ mikrotik_status: "disabled" }).in("id", ids);

    // Push to RouterOS one by one (best-effort)
    let pushed = 0;
    let failed = 0;
    for (const r of rows as any[]) {
      if (!r.mikrotik_id || !r.username) continue;
      try {
        const res = await fetch(`${url}/functions/v1/manage-mikrotik-ppp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ mikrotik_id: r.mikrotik_id, username: r.username, client_id: r.id, action: "disable" }),
        });
        if (res.ok) pushed++; else failed++;
      } catch { failed++; }
    }

    return new Response(JSON.stringify({ ok: true, disabled: ids.length, pushed, failed }), {
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
