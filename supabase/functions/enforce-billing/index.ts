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

    // 1. Read billing enforcement settings
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "billing_enforcement")
      .single();

    const settings = settingsRow?.setting_value as {
      enabled?: boolean;
      cutoff_time?: string;
      grace_days?: number;
      recheck_interval?: string;
    } | null;

    if (!settings?.enabled) {
      return new Response(
        JSON.stringify({ message: "Billing enforcement disabled", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const graceDays = settings.grace_days ?? 0;
    const cutoffTime = settings.cutoff_time ?? "00:00"; // HH:mm in Dhaka time

    // 2. Calculate the effective cutoff datetime in UTC
    // Dhaka is UTC+6, so we subtract 6 hours from the Dhaka time to get UTC
    const now = new Date();
    const [cutoffHour, cutoffMin] = cutoffTime.split(":").map(Number);
    
    // Build today's cutoff in Dhaka time, then convert to UTC
    const dhakaOffset = 6 * 60; // minutes
    const cutoffToday = new Date(now);
    cutoffToday.setUTCHours(cutoffHour - 6, cutoffMin, 0, 0); // Dhaka to UTC

    // If cutoff hasn't passed yet today, don't enforce
    if (now < cutoffToday) {
      return new Response(
        JSON.stringify({ message: "Cutoff time not reached yet", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find expired non-VIP clients whose expire_date + grace has passed
    // expire_date is stored as a date string (YYYY-MM-DD)
    const graceDate = new Date(now);
    graceDate.setDate(graceDate.getDate() - graceDays);
    const expireCutoff = graceDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: expiredClients, error: clientsErr } = await supabase
      .from("clients")
      .select("id, username, mikrotik_id, mikrotik_status, expire_date, name, client_id")
      .eq("is_vip", false)
      .neq("billing_status", "Paid")
      .neq("billing_status", "Free")
      .neq("billing_status", "Left")
      .lte("expire_date", expireCutoff)
      .eq("status", "active");

    if (clientsErr) {
      throw new Error(`Failed to query clients: ${clientsErr.message}`);
    }

    if (!expiredClients || expiredClients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired clients to enforce", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get all MikroTik servers for API calls
    const { data: servers } = await supabase
      .from("mikrotik_devices")
      .select("id, name, ip_address, api_port, username, password, enabled")
      .eq("enabled", true);

    const serverMap = new Map(
      (servers || []).map((s: any) => [s.id, s])
    );

    let processed = 0;
    const results: any[] = [];

    for (const client of expiredClients) {
      // Skip if already offline
      if (client.mikrotik_status === "offline") {
        continue;
      }

      // Try to disable via MikroTik API if we have server info
      if (client.mikrotik_id) {
        const server = serverMap.get(client.mikrotik_id);
        if (server) {
          try {
            // MikroTik REST API (v7+) - find PPP secret by name then disable
            const authHeader = "Basic " + btoa(`${server.username}:${server.password}`);
            const apiUrl = `http://${server.ip_address}:${server.api_port || 8728}`;

            // First find the PPP secret by name
            const findResp = await fetch(
              `${apiUrl}/rest/ppp/secret?name=${encodeURIComponent(client.username || "")}`,
              {
                headers: { Authorization: authHeader },
              }
            );

            if (findResp.ok) {
              const secrets = await findResp.json();
              if (secrets && secrets.length > 0) {
                const secretId = secrets[0][".id"];
                // Disable the PPP secret
                const disableResp = await fetch(`${apiUrl}/rest/ppp/secret/set`, {
                  method: "POST",
                  headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    ".id": secretId,
                    disabled: "yes",
                  }),
                });

                if (disableResp.ok) {
                  // Also disconnect active session
                  try {
                    const activeResp = await fetch(
                      `${apiUrl}/rest/ppp/active?name=${encodeURIComponent(client.username || "")}`,
                      { headers: { Authorization: authHeader } }
                    );
                    if (activeResp.ok) {
                      const activeSessions = await activeResp.json();
                      for (const session of activeSessions) {
                        await fetch(`${apiUrl}/rest/ppp/active/remove`, {
                          method: "POST",
                          headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ ".id": session[".id"] }),
                        });
                      }
                    }
                  } catch {
                    // Session disconnect is best-effort
                  }
                }
              }
            }
          } catch (err) {
            results.push({
              client_id: client.client_id,
              name: client.name,
              error: `MikroTik API error: ${err.message}`,
            });
          }
        }
      }

      // Update client status in DB regardless
      await supabase
        .from("clients")
        .update({ mikrotik_status: "offline" })
        .eq("id", client.id);

      processed++;
      results.push({
        client_id: client.client_id,
        name: client.name,
        status: "disabled",
      });
    }

    return new Response(
      JSON.stringify({
        message: `Billing enforcement complete`,
        processed,
        total_expired: expiredClients.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
