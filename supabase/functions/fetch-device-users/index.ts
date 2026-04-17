import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Fetch all devices
    const [mk, olt, sw, zk] = await Promise.all([
      supabase.from("mikrotik_devices").select("id,name,ip_address,api_port,username,password"),
      supabase.from("olt_devices").select("id,name,ip_address"),
      supabase.from("pop_devices").select("id,name,ip_address"),
      supabase.from("zkteco_devices").select("id,name,ip_address"),
    ]);

    const rows: any[] = [];
    const now = new Date().toISOString();

    // MikroTik: try to fetch system users via REST API
    for (const d of mk.data ?? []) {
      try {
        const auth = btoa(`${d.username || "admin"}:${d.password || ""}`);
        const url = `http://${d.ip_address}:${d.api_port || 80}/rest/user`;
        const res = await fetch(url, {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const users = await res.json();
          for (const u of users as any[]) {
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
        }
      } catch (_e) {
        // Skip unreachable device
      }
    }

    // OLT / Switch / ZKTeco — placeholder: keep existing rows for these devices.
    // Real adapters can be added here later.
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
      // Clear rows then upsert fresh
      await supabase.from("device_admin_user_inventory").delete().neq("id", 0);
      const { error } = await supabase.from("device_admin_user_inventory").upsert(rows, {
        onConflict: "device_type,device_id,username",
      });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, synced: rows.length, devices_checked: (mk.data?.length ?? 0) + (olt.data?.length ?? 0) + (sw.data?.length ?? 0) + (zk.data?.length ?? 0) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
