// Generic notification dispatcher — SMS / Email / WhatsApp
// Usage: supabase.functions.invoke('send-notification', { body: { tenant_id, channel, recipient, template_category?, body?, subject?, variables? } })
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  tenant_id: string;
  channel: "sms" | "email" | "whatsapp" | "telegram";
  recipient: string;
  template_category?: string;
  template_id?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, string | number>;
  context?: Record<string, unknown>;
}

function render(tpl: string, vars: Record<string, any> = {}) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}

async function sendSms(provider: any, recipient: string, body: string) {
  const cfg = provider.config || {};
  const p = (provider.provider || "").toLowerCase();
  // SSL Wireless
  if (p === "sslwireless" || p === "ssl_wireless") {
    const url = cfg.url || "https://smsplus.sslwireless.com/api/v3/send-sms";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: cfg.api_token,
        sid: cfg.sid || provider.sender_id,
        msisdn: recipient,
        sms: body,
        csms_id: crypto.randomUUID(),
      }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, id: j?.smsinfo?.[0]?.reference_id || null, raw: j };
  }
  // Mobireach / generic GET-style
  if (p === "mobireach") {
    const url = `${cfg.url}?username=${encodeURIComponent(cfg.username)}&password=${encodeURIComponent(cfg.password)}&from=${encodeURIComponent(provider.sender_id || "")}&to=${encodeURIComponent(recipient)}&message=${encodeURIComponent(body)}`;
    const r = await fetch(url);
    const txt = await r.text();
    return { ok: r.ok, id: null, raw: txt };
  }
  // Generic webhook
  if (p === "webhook") {
    const r = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cfg.headers || {}) },
      body: JSON.stringify({ to: recipient, message: body, sender: provider.sender_id }),
    });
    return { ok: r.ok, id: null, raw: await r.text() };
  }
  throw new Error(`Unsupported SMS provider: ${provider.provider}`);
}

async function sendEmail(provider: any, recipient: string, subject: string, body: string) {
  const cfg = provider.config || {};
  const p = (provider.provider || "").toLowerCase();
  if (p === "resend") {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.from || `${provider.sender_id || "noreply"}@${cfg.domain || "resend.dev"}`,
        to: [recipient],
        subject,
        html: body,
      }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, id: j?.id || null, raw: j };
  }
  throw new Error(`Unsupported email provider: ${provider.provider}`);
}

async function sendWhatsApp(provider: any, recipient: string, body: string) {
  const cfg = provider.config || {};
  const p = (provider.provider || "").toLowerCase();
  if (p === "whatsapp_cloud" || p === "meta") {
    const url = `https://graph.facebook.com/v20.0/${cfg.phone_number_id}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body },
      }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, id: j?.messages?.[0]?.id || null, raw: j };
  }
  throw new Error(`Unsupported WhatsApp provider: ${provider.provider}`);
}

async function sendTelegram(provider: any, recipient: string, body: string) {
  // recipient = chat_id (numeric string or @channelusername)
  const cfg = provider.config || {};
  const p = (provider.provider || "").toLowerCase();
  // Option A: Lovable Telegram connector gateway (no bot token in config)
  if (p === "lovable_gateway" || p === "gateway") {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      throw new Error("Telegram connector not linked (LOVABLE_API_KEY / TELEGRAM_API_KEY missing)");
    }
    const r = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
      },
      body: JSON.stringify({ chat_id: recipient, text: body, parse_mode: "HTML" }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j?.ok !== false, id: j?.result?.message_id ? String(j.result.message_id) : null, raw: j };
  }
  // Option B: raw bot token in provider.config.bot_token
  if (p === "telegram_bot" || p === "bot") {
    const token = cfg.bot_token;
    if (!token) throw new Error("bot_token missing in provider config");
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: recipient, text: body, parse_mode: "HTML" }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j?.ok !== false, id: j?.result?.message_id ? String(j.result.message_id) : null, raw: j };
  }
  throw new Error(`Unsupported Telegram provider: ${provider.provider}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const { tenant_id, channel, recipient, template_category, template_id, variables = {}, context = {} } = payload;
  if (!tenant_id || !channel || !recipient) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Resolve template if requested
  let subject = payload.subject || "";
  let body = payload.body || "";
  let templateId: string | null = template_id || null;

  if (!body && (template_category || template_id)) {
    let q = admin.from("notification_templates").select("*").eq("tenant_id", tenant_id).eq("channel", channel).eq("enabled", true).limit(1);
    if (template_id) q = q.eq("id", template_id);
    else q = q.eq("category", template_category!);
    const { data: tpl } = await q.maybeSingle();
    if (!tpl) return new Response(JSON.stringify({ error: "template_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    subject = render(tpl.subject || "", variables);
    body = render(tpl.body, variables);
    templateId = tpl.id;
  } else {
    subject = render(subject, variables);
    body = render(body, variables);
  }

  // Load provider
  const { data: provider } = await admin
    .from("notification_providers")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("channel", channel)
    .eq("enabled", true)
    .maybeSingle();

  if (!provider) {
    await admin.from("notification_logs").insert({
      tenant_id, template_id: templateId, channel, recipient, subject, body,
      status: "failed", error: "no_provider_configured", context,
    });
    return new Response(JSON.stringify({ error: "no_provider_configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let result: { ok: boolean; id: string | null; raw: any };
  try {
    if (channel === "sms") result = await sendSms(provider, recipient, body);
    else if (channel === "email") result = await sendEmail(provider, recipient, subject, body);
    else if (channel === "telegram") result = await sendTelegram(provider, recipient, body);
    else result = await sendWhatsApp(provider, recipient, body);
  } catch (e: any) {
    await admin.from("notification_logs").insert({
      tenant_id, template_id: templateId, channel, recipient, subject, body,
      status: "failed", provider: provider.provider, error: e.message, context,
    });
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await admin.from("notification_logs").insert({
    tenant_id, template_id: templateId, channel, recipient, subject, body,
    status: result.ok ? "sent" : "failed",
    provider: provider.provider,
    provider_message_id: result.id,
    error: result.ok ? null : JSON.stringify(result.raw).slice(0, 500),
    context,
    sent_at: result.ok ? new Date().toISOString() : null,
  });

  return new Response(JSON.stringify({ success: result.ok, message_id: result.id }), {
    status: result.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
