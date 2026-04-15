import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const deviceId = body.device_id || "all";

    // Fetch enabled MikroTik devices
    let devQuery = supabase
      .from("mikrotik_devices")
      .select("id, name, ip_address, api_port, username, password_encrypted, branch_id, version")
      .eq("enabled", true);

    if (deviceId !== "all") {
      devQuery = devQuery.eq("id", deviceId);
    }

    const { data: devices, error: devErr } = await devQuery;
    if (devErr) throw devErr;
    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No enabled devices found", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing client usernames to exclude
    const { data: existingClients } = await supabase
      .from("clients")
      .select("username");
    const existingUsernames = new Set(
      (existingClients || [])
        .map((c: any) => c.username?.toLowerCase())
        .filter(Boolean)
    );

    let totalSynced = 0;
    const errors: string[] = [];

    for (const device of devices) {
      try {
        const username = device.username || "admin";
        const password = device.password_encrypted || "";
        const port = device.api_port || 8728;
        const ip = device.ip_address;

        // Use MikroTik REST API (v7+) — port 443 or custom
        // REST API typically runs on the same port as webfig or a custom port
        // We'll try common REST API approaches
        const restPort = port === 8728 ? 80 : port; // API port 8728 is RouterOS API, REST is usually on HTTP port
        const authHeader = "Basic " + btoa(`${username}:${password}`);

        // Try HTTPS first, then HTTP
        let pppSecrets: any[] = [];
        let fetched = false;

        for (const protocol of ["https", "http"]) {
          if (fetched) break;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const resp = await fetch(
              `${protocol}://${ip}:${restPort}/rest/ppp/secret`,
              {
                headers: { Authorization: authHeader },
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);

            if (resp.ok) {
              pppSecrets = await resp.json();
              fetched = true;
            }
          } catch {
            // Try next protocol
          }
        }

        if (!fetched) {
          errors.push(`${device.name}: Could not connect to REST API`);
          continue;
        }

        if (!Array.isArray(pppSecrets)) {
          errors.push(`${device.name}: Unexpected response format`);
          continue;
        }

        // Filter out usernames already in clients table
        const newSecrets = pppSecrets.filter(
          (s: any) => !existingUsernames.has(s.name?.toLowerCase())
        );

        // Upsert into mikrotik_clients
        for (const secret of newSecrets) {
          const isDisabled = secret.disabled === "true" || secret.disabled === true;
          const { error: upsertErr } = await supabase
            .from("mikrotik_clients")
            .upsert(
              {
                name: secret.name,
                password: secret.password || "",
                service: secret.service || "pppoe",
                profile: secret.profile || "",
                caller_id: secret["caller-id"] || "",
                remote_address: secret["remote-address"] || "",
                mikrotik_id: device.id,
                server_name: device.name,
                branch_id: device.branch_id,
                user_status: isDisabled ? "disabled" : "unique",
                exported: false,
              },
              { onConflict: "name,mikrotik_id", ignoreDuplicates: false }
            );

          if (!upsertErr) totalSynced++;
        }
      } catch (err: any) {
        errors.push(`${device.name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, synced: totalSynced, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
