// Log an arbitrary event from the client side. Captures user, IP, UA.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    let branchId: string | null = null;
    if (auth.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
      if (userId) {
        const { data: prof } = await supabase.from("profiles").select("branch_id").eq("user_id", userId).maybeSingle();
        branchId = prof?.branch_id ?? null;
      }
    }

    const body = await req.json().catch(() => ({}));
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const ua = req.headers.get("user-agent") ?? null;

    const { data, error } = await supabase.from("system_logs").insert({
      user_id: userId,
      branch_id: branchId,
      action: body.action ?? "event",
      entity_type: body.entity_type ?? null,
      entity_id: body.entity_id ?? null,
      entity_label: body.entity_label ?? null,
      severity: body.severity ?? "info",
      ip_address: ip,
      user_agent: ua,
      device_name: body.device_name ?? null,
      metadata: body.metadata ?? {},
      log_message: body.message ?? `${body.action ?? "event"} ${body.entity_type ?? ""} ${body.entity_label ?? ""}`.trim(),
    }).select("id").maybeSingle();

    if (error) throw error;
    return new Response(JSON.stringify({ id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
