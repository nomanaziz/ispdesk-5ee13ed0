import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: "Telegram not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { chat_id, alert_id } = body;

    if (!chat_id) {
      return new Response(JSON.stringify({ error: "chat_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the alert
    let message = body.message;
    if (alert_id) {
      const { data: alert } = await supabase.from("alerts").select("*").eq("id", alert_id).single();
      if (alert) {
        const icon = alert.type === "critical" ? "🔴" : alert.type === "warning" ? "⚠️" : "📴";
        message = `${icon} <b>[${alert.type.toUpperCase()}]</b>\n${alert.message}${alert.rx_power ? `\nRX Power: ${alert.rx_power} dBm` : ""}`;
      }
    }

    if (!message) {
      return new Response(JSON.stringify({ error: "No message to send" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id, text: message, parse_mode: "HTML" }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, message_id: data.result?.message_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
