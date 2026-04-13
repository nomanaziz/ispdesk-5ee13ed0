import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all unmapped users
    const { data: unmapped } = await supabase.from("user_onu_mapping").select("*").eq("status", "unmapped");
    if (!unmapped || unmapped.length === 0) {
      return new Response(JSON.stringify({ ok: true, mapped: 0, message: "No unmapped users" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let mappedCount = 0;

    for (const user of unmapped) {
      // Match caller_id_mac with ONU mac
      const { data: onu } = await supabase.from("onu_list").select("id").eq("mac", user.caller_id_mac).single();

      if (onu) {
        // Update mapping
        await supabase.from("user_onu_mapping").update({
          onu_id: onu.id,
          status: "mapped",
          mapped_at: new Date().toISOString(),
        }).eq("id", user.id);

        // Update ONU description with PPP username
        await supabase.from("onu_list").update({
          description: user.ppp_username,
        }).eq("id", onu.id);

        mappedCount++;
      }
    }

    return new Response(JSON.stringify({ ok: true, mapped: mappedCount, total_checked: unmapped.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
