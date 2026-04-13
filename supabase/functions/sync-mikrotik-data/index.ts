import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { users } = body; // Array of { username, caller_id_mac, ip_address }

    if (!Array.isArray(users)) {
      return new Response(JSON.stringify({ error: "users must be an array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert PPPoE user data into user_onu_mapping
    let inserted = 0;
    for (const user of users) {
      const { error } = await supabase.from("user_onu_mapping").upsert(
        { ppp_username: user.username, caller_id_mac: user.caller_id_mac, status: "unmapped" },
        { onConflict: "caller_id_mac", ignoreDuplicates: false }
      );
      if (!error) inserted++;
    }

    return new Response(JSON.stringify({ ok: true, processed: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
