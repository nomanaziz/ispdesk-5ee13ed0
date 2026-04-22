import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function tgGet(token: string, method: string, body: any) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  return { ok: r.ok && j.ok, data: j };
}

interface BotEntry {
  owner_type: "admin" | "pop";
  owner_id: string;
  token: string;
  username?: string | null;
}

async function processBot(supabase: any, bot: BotEntry) {
  // load offset
  const { data: state } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("owner_type", bot.owner_type)
    .eq("owner_id", bot.owner_id)
    .maybeSingle();
  let offset = state?.update_offset || 0;

  const { ok, data } = await tgGet(bot.token, "getUpdates", {
    offset,
    timeout: 0,
    allowed_updates: ["message"],
  });
  if (!ok) return { processed: 0, error: data?.description };

  const updates = data.result || [];
  let processed = 0;

  for (const u of updates) {
    const msg = u.message;
    if (!msg) continue;
    const chatId = msg.chat?.id;
    const text: string = msg.text || "";

    // match /start <token>
    const m = text.match(/^\/start\s+([A-Za-z0-9_-]{6,})/);
    if (m && chatId) {
      const linkToken = m[1];
      const { data: req } = await supabase
        .from("telegram_link_requests")
        .select("token, client_id, owner_type, owner_id, consumed_at, expires_at")
        .eq("token", linkToken)
        .maybeSingle();

      if (req && !req.consumed_at && new Date(req.expires_at) > new Date()) {
        await supabase
          .from("clients")
          .update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() })
          .eq("id", req.client_id);
        await supabase
          .from("telegram_link_requests")
          .update({ consumed_at: new Date().toISOString() })
          .eq("token", linkToken);
        await tgGet(bot.token, "sendMessage", {
          chat_id: chatId,
          text: "✅ আপনি সফলভাবে নোটিফিকেশনের জন্য যুক্ত হলেন। এখন থেকে বিল ও আপডেট এখানেই পাবেন।",
        });
      } else {
        await tgGet(bot.token, "sendMessage", {
          chat_id: chatId,
          text: "⚠️ লিঙ্কটি অবৈধ বা মেয়াদোত্তীর্ণ। আপনার ISP-এর কাছ থেকে নতুন লিঙ্ক নিন।",
        });
      }
    } else if (text === "/start" && chatId) {
      await tgGet(bot.token, "sendMessage", {
        chat_id: chatId,
        text: "👋 স্বাগতম! এই বটে একাউন্ট লিঙ্ক করতে আপনার ISP-এর দেওয়া লিঙ্ক ব্যবহার করুন।",
      });
    }

    offset = u.update_id + 1;
    processed++;
  }

  if (processed > 0) {
    await supabase
      .from("telegram_bot_state")
      .upsert(
        {
          owner_type: bot.owner_type,
          owner_id: bot.owner_id,
          update_offset: offset,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_type,owner_id" }
      );
  }

  return { processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bots: BotEntry[] = [];

    // admin bot
    const { data: adminCfg } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "admin_telegram_bot")
      .maybeSingle();
    const a = adminCfg?.value || {};
    if (a.active && a.token) {
      bots.push({ owner_type: "admin", owner_id: "global", token: a.token, username: a.username });
    }

    // pop bots
    const { data: pops } = await supabase
      .from("branch_managers")
      .select("id, telegram_bot_token, telegram_bot_username, telegram_bot_active")
      .eq("telegram_bot_active", true)
      .not("telegram_bot_token", "is", null);
    (pops || []).forEach((p: any) => {
      bots.push({
        owner_type: "pop",
        owner_id: p.id,
        token: p.telegram_bot_token,
        username: p.telegram_bot_username,
      });
    });

    const results: any[] = [];
    for (const b of bots) {
      try {
        const r = await processBot(supabase, b);
        results.push({ owner_type: b.owner_type, owner_id: b.owner_id, ...r });
      } catch (e: any) {
        results.push({ owner_type: b.owner_type, owner_id: b.owner_id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, bots: bots.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
