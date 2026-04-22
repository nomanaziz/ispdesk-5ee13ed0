// Portal Notes edge function — secure CRUD for POP & Client portal users.
// Uses portal JWT (signed with PORTAL_JWT_SECRET) and service role key for DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function verifyPortalJwt(token: string, secret: string): Promise<any | null> {
  try {
    const [h, p, sig] = token.split(".");
    if (!h || !p || !sig) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(b64urlDecode(sig), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret =
      Deno.env.get("PORTAL_JWT_SECRET") ||
      Deno.env.get("SUPABASE_JWT_SECRET") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      "";
    const claims = await verifyPortalJwt(token, secret);
    if (!claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = String(claims.sub);
    const userType: string = claims.type || "client";
    // Map portal user type to owner_type
    const ownerType =
      userType === "reseller" || userType === "reseller_sub"
        ? userType === "reseller_sub" ? "pop_sub" : "pop"
        : userType === "bw_customer"
          ? "bw_customer"
          : "client";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, payload = {} } = await req.json();

    const COLORS = ["yellow", "blue", "green", "pink", "purple", "orange"];
    const cleanColor = (c?: string) =>
      COLORS.includes(String(c || "")) ? c : "yellow";

    let result: any;
    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("user_notes")
          .select("*")
          .eq("owner_type", ownerType)
          .eq("owner_id", ownerId)
          .order("pinned", { ascending: false })
          .order("updated_at", { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }
      case "create": {
        const { data, error } = await supabase
          .from("user_notes")
          .insert({
            owner_type: ownerType,
            owner_id: ownerId,
            title: payload.title || null,
            content: String(payload.content || ""),
            color: cleanColor(payload.color),
            pinned: !!payload.pinned,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "update": {
        if (!payload.id) throw new Error("id required");
        const patch: any = {};
        if ("title" in payload) patch.title = payload.title;
        if ("content" in payload) patch.content = String(payload.content || "");
        if ("color" in payload) patch.color = cleanColor(payload.color);
        if ("pinned" in payload) patch.pinned = !!payload.pinned;
        const { data, error } = await supabase
          .from("user_notes")
          .update(patch)
          .eq("id", payload.id)
          .eq("owner_type", ownerType)
          .eq("owner_id", ownerId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "delete": {
        if (!payload.id) throw new Error("id required");
        const { error } = await supabase
          .from("user_notes")
          .delete()
          .eq("id", payload.id)
          .eq("owner_type", ownerType)
          .eq("owner_id", ownerId);
        if (error) throw error;
        result = { ok: true };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-notes error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
