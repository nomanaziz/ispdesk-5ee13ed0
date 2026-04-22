import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRequest {
  owner_type: "admin" | "pop";
  owner_id: string; // pop: branch_managers.id  | admin: 'global'
  recipients: Array<{ phone?: string; client_id?: string; chat_id?: number }>;
  message: string;
  fallback_to_sms?: boolean; // for now, just reports counts; SMS path is handled by caller
}

async function getBotToken(supabase: any, owner_type: string, owner_id: string) {
  if (owner_type === "pop") {
    const { data, error } = await supabase
      .from("branch_managers")
      .select("telegram_bot_token, telegram_bot_username, telegram_bot_active")
      .eq("id", owner_id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.telegram_bot_active || !data?.telegram_bot_token) {
      throw new Error("POP-এর Telegram bot সক্রিয় নয়");
    }
    return { token: data.telegram_bot_token, username: data.telegram_bot_username };
  } else {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "admin_telegram_bot")
      .maybeSingle();
    if (error) throw error;
    const val = (data as any)?.setting_value || {};
    if (!val.active || !val.token) throw new Error("Admin-এর Telegram bot সক্রিয় নয়");
    return { token: val.token as string, username: val.username as string };
  }
}

async function tgSend(token: string, chat_id: number, text: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
  });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.description || `Telegram error ${r.status}`);
  return j.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as SendRequest;
    if (!body.owner_type || !body.owner_id) throw new Error("owner_type ও owner_id প্রয়োজন");
    if (!body.message) throw new Error("message প্রয়োজন");
    if (!Array.isArray(body.recipients) || body.recipients.length === 0)
      throw new Error("recipients প্রয়োজন");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token } = await getBotToken(supabase, body.owner_type, body.owner_id);

    // Resolve chat_ids: prefer explicit, then phone match against clients
    const phones = body.recipients.map((r) => r.phone).filter(Boolean) as string[];
    const cids = body.recipients.map((r) => r.client_id).filter(Boolean) as string[];

    const map = new Map<string, number>(); // phone or client_id -> chat_id
    if (phones.length) {
      const { data } = await supabase
        .from("clients")
        .select("id, contact, telegram_chat_id")
        .in("contact", phones)
        .not("telegram_chat_id", "is", null);
      (data || []).forEach((c: any) => {
        if (c.contact) map.set(c.contact, Number(c.telegram_chat_id));
        if (c.id) map.set(c.id, Number(c.telegram_chat_id));
      });
    }
    if (cids.length) {
      const { data } = await supabase
        .from("clients")
        .select("id, contact, telegram_chat_id")
        .in("id", cids)
        .not("telegram_chat_id", "is", null);
      (data || []).forEach((c: any) => {
        if (c.id) map.set(c.id, Number(c.telegram_chat_id));
        if (c.contact) map.set(c.contact, Number(c.telegram_chat_id));
      });
    }

    const sent: any[] = [];
    const failed: any[] = [];
    const noChannel: any[] = [];

    for (const r of body.recipients) {
      const chat = r.chat_id ?? (r.client_id && map.get(r.client_id)) ?? (r.phone && map.get(r.phone));
      if (!chat) {
        noChannel.push(r);
        continue;
      }
      try {
        await tgSend(token, Number(chat), body.message);
        sent.push({ ...r, chat_id: chat });
      } catch (e: any) {
        failed.push({ ...r, error: e.message });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent_count: sent.length,
        failed_count: failed.length,
        no_telegram_count: noChannel.length,
        sent,
        failed,
        no_telegram: noChannel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
