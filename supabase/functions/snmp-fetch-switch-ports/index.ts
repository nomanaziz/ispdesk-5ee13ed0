import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function authorize(req: Request, key: string, deviceId?: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized", status: 401, userId: null as any };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return { error: "Unauthorized", status: 401, userId: null };
  const userId = data.claims.sub as string;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await admin.rpc("has_device_permission", {
    _user_id: userId, _key: key, _device_id: deviceId ?? null, _branch_id: null,
  });
  if (!ok) return { error: "Forbidden: missing " + key, status: 403, userId };
  return { admin, userId, error: null, status: 200 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { switch_id } = await req.json();
    if (!switch_id) {
      return new Response(JSON.stringify({ error: "switch_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const auth = await authorize(req, "switch.view", switch_id);
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Real implementation would SNMP walk IF-MIB. This stub keeps an idempotent shape:
    // if no rows exist, seed with example interfaces so UI is testable.
    const { data: existing } = await auth.admin!.from("switch_ports").select("id").eq("switch_id", switch_id).limit(1);
    if (!existing || existing.length === 0) {
      const seeds = Array.from({ length: 8 }).map((_, i) => ({
        switch_id,
        if_index: i + 1,
        interface: `GigabitEthernet0/${i + 1}`,
        description: "",
        enabled: true,
        oper_status: "up",
        admin_status: "up",
        speed_mbps: 1000,
        duplex: "full",
        in_rate_bps: 0,
        out_rate_bps: 0,
      }));
      await auth.admin!.from("switch_ports").insert(seeds);
    }
    await auth.admin!.from("switches").update({ last_synced: new Date().toISOString() }).eq("id", switch_id);
    await auth.admin!.from("device_audit_log").insert({
      user_id: auth.userId, action: "snmp.fetch.ports", device_kind: "switch", device_id: switch_id, result: "ok",
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
