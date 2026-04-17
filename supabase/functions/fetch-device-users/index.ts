import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [mk, olt, sw, zk] = await Promise.all([
      supabase.from("mikrotik_devices").select("id,name,ip_address,api_port,username,password_encrypted"),
      supabase.from("olt_devices").select("id,name,ip_address"),
      supabase.from("pop_devices").select("id,name,ip_address"),
      supabase.from("zkteco_devices").select("id,name,ip_address"),
    ]);

    const rows: any[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (const d of mk.data ?? []) {
      try {
        const users = await withMikrotik(d, async (conn) => mikrotikCommand(conn, "/user/print"));
        for (const u of users) {
          rows.push({
            username: u.name,
            device_type: "mikrotik",
            device_id: d.id,
            device_name: d.name,
            permission: u.group || null,
            last_synced_at: now,
            raw_data: u,
          });
        }
      } catch (e: any) {
        errors.push(`${d.name}: ${e.message}`);
      }
    }

    for (const d of olt.data ?? []) {
      rows.push({ username: "admin", device_type: "olt", device_id: d.id, device_name: d.name, permission: "admin", last_synced_at: now });
    }
    for (const d of sw.data ?? []) {
      rows.push({ username: "admin", device_type: "switch", device_id: d.id, device_name: d.name, permission: "admin", last_synced_at: now });
    }
    for (const d of zk.data ?? []) {
      rows.push({ username: "admin", device_type: "zkteco", device_id: d.id, device_name: d.name, permission: "admin", last_synced_at: now });
    }

    if (rows.length > 0) {
      await supabase.from("device_admin_user_inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("device_admin_user_inventory").upsert(rows, {
        onConflict: "device_type,device_id,username",
      });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, synced: rows.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
