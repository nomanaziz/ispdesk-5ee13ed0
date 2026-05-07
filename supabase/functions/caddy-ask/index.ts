// Caddy on-demand TLS ask endpoint. Returns 200 if domain is verified/active.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") ?? "").toLowerCase().trim();
  if (!domain) return new Response("missing domain", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data } = await supabase
    .from("tenant_domains")
    .select("id, status")
    .eq("domain", domain)
    .in("status", ["verified", "active"])
    .maybeSingle();

  return new Response(data ? "ok" : "not allowed", { status: data ? 200 : 404 });
});
