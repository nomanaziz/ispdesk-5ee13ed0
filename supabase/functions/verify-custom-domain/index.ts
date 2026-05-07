// Verify a custom domain by checking DNS records (CNAME + TXT)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_CNAME = Deno.env.get("CUSTOM_DOMAIN_TARGET") ?? "edge.ispdesk.app";

async function dohQuery(name: string, type: "TXT" | "CNAME") {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS query failed: ${res.status}`);
  const json = await res.json();
  return (json.Answer ?? []).map((a: any) => String(a.data).replace(/^"|"$/g, "").replace(/\.$/, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { domainId } = await req.json();
    if (!domainId) {
      return new Response(JSON.stringify({ error: "domainId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error } = await supabase
      .from("tenant_domains")
      .select("*")
      .eq("id", domainId)
      .maybeSingle();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "Domain not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tenant_domains")
      .update({ status: "verifying", last_checked_at: new Date().toISOString() })
      .eq("id", domainId);

    const errors: string[] = [];

    // CNAME check (root or www)
    let cnameOk = false;
    try {
      const cname = await dohQuery(row.domain, "CNAME");
      cnameOk = cname.some((v: string) => v.toLowerCase() === EXPECTED_CNAME.toLowerCase());
      if (!cnameOk) errors.push(`CNAME does not point to ${EXPECTED_CNAME} (found: ${cname.join(", ") || "none"})`);
    } catch (e) {
      errors.push(`CNAME lookup failed: ${(e as Error).message}`);
    }

    // TXT verification token
    let txtOk = false;
    try {
      const txt = await dohQuery(`_lovable_verify.${row.domain}`, "TXT");
      txtOk = txt.includes(row.verification_token);
      if (!txtOk) errors.push(`TXT token mismatch (expected: ${row.verification_token})`);
    } catch (e) {
      errors.push(`TXT lookup failed: ${(e as Error).message}`);
    }

    const success = cnameOk && txtOk;
    await supabase.from("tenant_domains").update({
      status: success ? "verified" : "failed",
      error_message: success ? null : errors.join(" | "),
      last_checked_at: new Date().toISOString(),
    }).eq("id", domainId);

    return new Response(JSON.stringify({ success, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
