import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function authorize(req: Request, key: string, deviceId?: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized", status: 401, userId: null };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return { error: "Unauthorized", status: 401, userId: null };
  const userId = data.claims.sub as string;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await admin.rpc("has_device_permission", {
    _user_id: userId,
    _key: key,
    _device_id: deviceId ?? null,
    _branch_id: null,
  });
  if (!ok) return { error: "Forbidden: missing " + key, status: 403, userId };
  return { admin, userId, error: null, status: 200 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { switch_id } = await req.json();
    if (!switch_id) {
      return new Response(JSON.stringify({ error: "switch_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const auth = await authorize(req, "switch.view", switch_id);
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Stub: real SNMP would walk sysName/sysDescr/sysUpTime here.
    // For now mark device as synced + heuristic uptime placeholder.
    const { data: sw } = await auth.admin!.from("switches").select("ip_address,vendor").eq("id", switch_id).maybeSingle();
    const updates = {
      uptime: "—",
      cpu_usage: null,
      memory_usage: null,
      status: "online" as const,
      last_synced: new Date().toISOString(),
    };
    await auth.admin!.from("switches").update(updates).eq("id", switch_id);
    return new Response(JSON.stringify({ ok: true, sw, updates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
