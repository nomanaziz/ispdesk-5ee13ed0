import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PortalToken {
  sub: string;
  type: "client" | "bw_customer" | "reseller" | "reseller_sub";
  exp: number;
  username?: string;
  name?: string;
}

function decodeToken(authHeader: string | null): PortalToken | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(atob(token));
    if (!payload.sub || !payload.type || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload as PortalToken;
  } catch {
    return null;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const tok = decodeToken(req.headers.get("Authorization"));
  if (!tok) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = String(body.action || "");
  const payload = body.payload || {};

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    switch (action) {
      case "get_dashboard": {
        if (tok.type !== "client") {
          // bw_customer
          const { data: cust } = await sb
            .from("bw_sale_customers")
            .select("*")
            .eq("id", tok.sub)
            .maybeSingle();
          const { data: invoices } = await sb
            .from("bw_sales_invoices")
            .select("*")
            .eq("customer_id", tok.sub)
            .order("created_at", { ascending: false })
            .limit(24);
          return json({ customer: cust, invoices: invoices || [] });
        }
        const { data: client } = await sb
          .from("clients")
          .select(
            "*, isp_packages(name, price, download_speed, upload_speed), zones(name), sub_zones(name), connection_types(name), protocol_types(name)"
          )
          .eq("id", tok.sub)
          .maybeSingle();
        const { data: bills } = await sb
          .from("billing")
          .select("id, bill_id, month, amount, paid, due, status, discount, vat, created_at, due_date, pay_date, extend_date, payment_method")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(24);
        const { data: collections } = await sb
          .from("bill_collections")
          .select("id, amount, discount, payment_method, note, created_at, transaction_id")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(24);
        const { data: notices } = await sb
          .from("client_notices")
          .select("*")
          .eq("active", true)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5);
        return json({ client, bills: bills || [], collections: collections || [], notices: notices || [] });
      }

      case "get_bills": {
        if (tok.type !== "client") return json({ bills: [] });
        const { data } = await sb
          .from("billing")
          .select("*")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false });
        return json({ bills: data || [] });
      }

      case "get_ledger": {
        if (tok.type === "client") {
          const [{ data: bills }, { data: cols }] = await Promise.all([
            sb.from("billing").select("bill_id, amount, paid, due, month, created_at").eq("client_id", tok.sub).order("created_at"),
            sb.from("bill_collections").select("amount, discount, payment_method, note, created_at").eq("client_id", tok.sub).order("created_at"),
          ]);
          return json({ bills: bills || [], collections: cols || [] });
        }
        const [{ data: invoices }, { data: cols }] = await Promise.all([
          sb.from("bw_sales_invoices").select("invoice_no, amount, paid_amount, created_at, month").eq("customer_id", tok.sub).order("created_at"),
          sb.from("bw_sale_collections").select("amount, receive_date, created_at, payment_method, note").eq("customer_id", tok.sub).order("receive_date"),
        ]);
        return json({ invoices: invoices || [], collections: cols || [] });
      }

      case "get_notices": {
        const [{ data: notices }, { data: news }] = await Promise.all([
          sb.from("client_notices").select("*").eq("active", true).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
          sb.from("client_news_events").select("*").eq("active", true).order("created_at", { ascending: false }),
        ]);
        return json({ notices: notices || [], news: news || [] });
      }

      case "get_profile": {
        if (tok.type !== "client") return json({ client: null, requests: [] });
        const { data: client } = await sb
          .from("clients")
          .select("id, name, client_id, username, contact, email, address, present_address, permanent_address, nid_number, photo_url, nid_front_url, nid_back_url, documents")
          .eq("id", tok.sub)
          .maybeSingle();
        const { data: requests } = await sb
          .from("client_update_requests")
          .select("*")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(20);
        return json({ client, requests: requests || [] });
      }

      case "update_profile": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const allowed = ["present_address", "permanent_address", "contact", "email"];
        const updates: Record<string, any> = {};
        for (const k of allowed) {
          if (typeof payload[k] === "string") updates[k] = payload[k].slice(0, 500);
        }
        if (!Object.keys(updates).length) return json({ error: "No fields" }, 400);
        const { error } = await sb.from("clients").update(updates).eq("id", tok.sub);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "submit_doc_update": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        // payload.changes: {photo_url?, nid_front_url?, nid_back_url?, documents?}
        const allowed = ["photo_url", "nid_front_url", "nid_back_url", "documents", "name", "nid_number"];
        const changes: Record<string, any> = {};
        for (const k of allowed) {
          if (payload.changes?.[k] !== undefined) changes[k] = payload.changes[k];
        }
        if (!Object.keys(changes).length) return json({ error: "No changes" }, 400);
        const { error } = await sb.from("client_update_requests").insert({
          client_id: tok.sub,
          request_type: "document",
          changes,
          note: payload.note || null,
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "upload_document": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        // payload: { filename, content_type, base64 }
        const { filename, content_type, base64 } = payload;
        if (!filename || !base64) return json({ error: "Missing file" }, 400);
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (content_type && !allowedTypes.includes(content_type)) {
          return json({ error: "Unsupported file type" }, 400);
        }
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        if (bytes.length > 5 * 1024 * 1024) return json({ error: "File too large (max 5MB)" }, 400);
        const ext = (filename.split(".").pop() || "bin").toLowerCase().slice(0, 8);
        const path = `${tok.sub}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await sb.storage
          .from("client-documents")
          .upload(path, bytes, { contentType: content_type || "application/octet-stream", upsert: false });
        if (upErr) return json({ error: upErr.message }, 500);
        const { data: signed } = await sb.storage
          .from("client-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        return json({ path, url: signed?.signedUrl });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("portal-data error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
