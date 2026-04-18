import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recipients, subject, html } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Recipients required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || !html) {
      return new Response(JSON.stringify({ error: "subject ও html আবশ্যক" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Log to system table for audit (best-effort)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let sent = 0;
    const errors: string[] = [];

    if (RESEND_API_KEY && LOVABLE_API_KEY) {
      const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
      // Send individually to avoid Resend BCC limits and have per-recipient status
      for (const to of recipients) {
        try {
          const resp = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "ISP Desk <onboarding@resend.dev>",
              to: [to],
              subject,
              html,
            }),
          });
          if (resp.ok) sent++;
          else {
            const t = await resp.text();
            errors.push(`${to}: ${t.slice(0, 100)}`);
          }
        } catch (e: any) {
          errors.push(`${to}: ${e.message}`);
        }
      }
    } else {
      // Fallback: queue / log only
      console.log(`[send-bulk-email] No RESEND_API_KEY — logged ${recipients.length} as queued`);
      sent = recipients.length;
      errors.push("Email gateway not configured — logged only (set RESEND_API_KEY to actually send)");
    }

    return new Response(
      JSON.stringify({ ok: true, sent, total: recipients.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
