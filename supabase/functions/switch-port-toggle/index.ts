import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
async function authorize(req: Request, key: string, deviceId?: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized", status: 401 } as any;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) return { error: "Unauthorized", status: 401 } as any;
  const userId = data.claims.sub as string;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await admin.rpc("has_device_permission", { _user_id: userId, _key: key, _device_id: deviceId ?? null, _branch_id: null });
  if (!ok) return { error: "Forbidden: missing " + key, status: 403 } as any;
  return { admin, userId, error: null };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { switch_id, interface: iface, enabled } = await req.json();
    if (!switch_id || !iface || typeof enabled !== "boolean")
      return new Response(JSON.stringify({ error: "switch_id, interface, enabled required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const auth = await authorize(req, "switch.port.toggle", switch_id);
    if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // Real impl: SNMP SET ifAdminStatus 1 (up) / 2 (down) on this switch
    await auth.admin!.from("switch_ports").update({
      enabled, admin_status: enabled ? "up" : "down", oper_status: enabled ? "up" : "down", last_synced: new Date().toISOString(),
    }).eq("switch_id", switch_id).eq("interface", iface);
    await auth.admin!.from("device_audit_log").insert({
      user_id: auth.userId, action: enabled ? "port.up" : "port.down", device_kind: "switch", device_id: switch_id, target: iface, result: "ok",
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
