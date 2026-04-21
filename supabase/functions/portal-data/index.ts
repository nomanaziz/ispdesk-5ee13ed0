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

const hasLegacySwappedPackageRates = (pkg: {
  buy_rate?: number | null;
  selling_rate?: number | null;
}) => {
  const buy = Number(pkg.buy_rate ?? 0);
  const sell = Number(pkg.selling_rate ?? 0);
  return Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0 && buy > sell;
};

const normalizePackageRates = <T extends { buy_rate?: number | null; selling_rate?: number | null }>(
  pkg: T,
) => {
  if (!hasLegacySwappedPackageRates(pkg)) {
    return {
      ...pkg,
      buy_rate: Number(pkg.buy_rate ?? 0),
      selling_rate: Number(pkg.selling_rate ?? 0),
    };
  }

  return {
    ...pkg,
    buy_rate: Number(pkg.selling_rate ?? 0),
    selling_rate: Number(pkg.buy_rate ?? 0),
  };
};

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

  // Helper: load full client with joined refs (correct schema)
  const loadClient = async () => {
    const { data: client } = await sb
      .from("clients")
      .select(
        "id, name, client_id, username, contact, email, address, present_address, permanent_address, nid_number, photo_url, nid_front_url, nid_back_url, monthly_bill, status, billing_status, joining_date, expire_date, billing_date, speed, connection_type, protocol_type, mac_address, remote_address, server_name, profile, is_online, total_upload, total_download, package_id, zone_id, sub_zone_id, branch_id"
      )
      .eq("id", tok.sub)
      .maybeSingle();
    if (!client) return null;
    const [pkg, zone, subZone] = await Promise.all([
      client.package_id
        ? sb.from("isp_packages").select("id, name, code, bandwidth_down, bandwidth_up, price").eq("id", client.package_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      client.zone_id
        ? sb.from("zones").select("id, name").eq("id", client.zone_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      client.sub_zone_id
        ? sb.from("sub_zones").select("id, name").eq("id", client.sub_zone_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    return { ...client, package: pkg.data, zone: zone.data, sub_zone: subZone.data };
  };

  const computeBalance = (bills: any[], cols: any[]) => {
    const totalBill = bills.reduce((s, b) => s + Number(b.amount || 0) - Number(b.discount || 0), 0);
    const totalPaid = cols.reduce((s, c) => s + Number(c.amount || 0), 0);
    const due = totalBill - totalPaid;
    return { totalBill, totalPaid, due };
  };

  try {
    switch (action) {
      case "get_dashboard": {
        if (tok.type !== "client") {
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
        const client = await loadClient();
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
        let notices: any[] = [];
        try {
          const r = await sb
            .from("client_notices")
            .select("*")
            .eq("active", true)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(5);
          notices = r.data || [];
        } catch (_) { /* table may not exist */ }
        const balance = computeBalance(bills || [], collections || []);
        return json({ client, bills: bills || [], collections: collections || [], notices, balance });
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

      case "get_invoices": {
        // Client => billing rows; bw_customer => bw_sales_invoices
        if (tok.type === "client") {
          const { data } = await sb
            .from("billing")
            .select("*")
            .eq("client_id", tok.sub)
            .order("created_at", { ascending: false });
          return json({ invoices: data || [], kind: "billing" });
        }
        const { data } = await sb
          .from("bw_sales_invoices")
          .select("*")
          .eq("customer_id", tok.sub)
          .order("created_at", { ascending: false });
        return json({ invoices: data || [], kind: "bw" });
      }

      case "get_bill_detail": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const billId = String(payload.id || "");
        if (!billId) return json({ error: "Missing id" }, 400);
        const { data: bill } = await sb
          .from("billing")
          .select("*")
          .eq("id", billId)
          .eq("client_id", tok.sub)
          .maybeSingle();
        if (!bill) return json({ error: "Bill not found" }, 404);
        const { data: client } = await sb
          .from("clients")
          .select("name, client_id, contact, address, email, monthly_bill")
          .eq("id", tok.sub)
          .maybeSingle();
        const { data: settings } = await sb
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "company_info")
          .maybeSingle();
        const ci: any = settings?.setting_value || {};
        const company = {
          name: ci.company_name || ci.name || "ISP Desk",
          address: ci.company_address || ci.address1 || ci.address || "",
          hotline: ci.hotline || ci.mobile1 || ci.phone1 || ci.phone || "",
          email: ci.email || "",
          website: ci.website || "",
          logo_url: ci.logo_url || "",
          payment_instructions: ci.payment_instructions || "",
          tagline: ci.tagline || "",
        };
        return json({ bill, client, company });
      }

      case "submit_bill_payment": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const { billing_id, amount, payment_method, transaction_id, note } = payload;
        if (!billing_id || !amount || !transaction_id) return json({ error: "Missing fields" }, 400);
        // Verify bill belongs to client
        const { data: bill } = await sb
          .from("billing")
          .select("id, client_id")
          .eq("id", billing_id)
          .eq("client_id", tok.sub)
          .maybeSingle();
        if (!bill) return json({ error: "Bill not found" }, 404);
        const { error } = await sb.from("bill_collections").insert({
          billing_id,
          client_id: tok.sub,
          amount: Number(amount),
          payment_method: payment_method || "bkash",
          transaction_id,
          note: note || "Online payment via portal",
          status: "pending",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "get_ledger": {
        if (tok.type === "client") {
          const [{ data: bills }, { data: cols }] = await Promise.all([
            sb.from("billing").select("bill_id, amount, paid, due, discount, month, created_at").eq("client_id", tok.sub).order("created_at"),
            sb.from("bill_collections").select("amount, discount, payment_method, note, created_at").eq("client_id", tok.sub).order("created_at"),
          ]);
          const balance = computeBalance(bills || [], cols || []);
          return json({ bills: bills || [], collections: cols || [], balance });
        }
        const [{ data: invoices }, { data: cols }] = await Promise.all([
          sb.from("bw_sales_invoices").select("invoice_no, amount, paid_amount, created_at, month").eq("customer_id", tok.sub).order("created_at"),
          sb.from("bw_sale_collections").select("amount, receive_date, created_at, payment_method, note").eq("customer_id", tok.sub).order("receive_date"),
        ]);
        return json({ invoices: invoices || [], collections: cols || [] });
      }

      case "get_notices": {
        const out: any = { notices: [], news: [] };
        try {
          const { data } = await sb.from("client_notices").select("*").eq("active", true).order("pinned", { ascending: false }).order("created_at", { ascending: false });
          out.notices = data || [];
        } catch (_) {}
        try {
          const { data } = await sb.from("client_news_events").select("*").eq("active", true).order("created_at", { ascending: false });
          out.news = data || [];
        } catch (_) {}
        return json(out);
      }

      case "get_company": {
        const { data: settings } = await sb
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "company_info")
          .maybeSingle();
        const ci: any = settings?.setting_value || {};
        return json({
          company: {
            name: ci.company_name || ci.name || "ISP Desk",
            tagline: ci.tagline || "",
            address: ci.company_address || ci.address1 || ci.address || "",
            address2: ci.address2 || "",
            hotline: ci.hotline || "",
            mobile: ci.mobile1 || ci.mobile2 || "",
            phone: ci.phone1 || ci.phone || "",
            email: ci.email || "",
            website: ci.website || "",
            logo_url: ci.logo_url || "",
            payment_instructions: ci.payment_instructions || "",
          },
          raw: ci,
        });
      }

      case "get_live_usage": {
        if (tok.type !== "client") return json({ client: null });
        const client = await loadClient();
        return json({ client });
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

      case "get_tariff_packages": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        // Resolve reseller's tariff_id from branch_managers (token may be stale)
        const resellerId =
          tok.type === "reseller_sub"
            ? (tok as any).parent_reseller_id
            : tok.sub;
        if (!resellerId) return json({ error: "No reseller" }, 400);
        const { data: pop } = await sb
          .from("branch_managers")
          .select("tariff_id")
          .eq("id", resellerId)
          .maybeSingle();
        const tariffId = pop?.tariff_id;
        if (!tariffId) return json({ packages: [] });
        const { data: pkgs, error } = await sb
          .from("reseller_tariff_packages")
          .select(
            "id, buy_rate, selling_rate, mikrotik_profile, protocol_type, validity_days, min_activation_days, package_id, mikrotik_server_id"
          )
          .eq("tariff_id", tariffId)
          .eq("status", "active");
        if (error) return json({ error: error.message }, 500);
        const pkgIds = Array.from(new Set((pkgs ?? []).map((p) => p.package_id).filter(Boolean)));
        const srvIds = Array.from(new Set((pkgs ?? []).map((p) => p.mikrotik_server_id).filter(Boolean)));
        const [pkgRefs, srvRefs] = await Promise.all([
          pkgIds.length
            ? sb.from("isp_packages").select("id, name, bandwidth_down, package_type").in("id", pkgIds)
            : Promise.resolve({ data: [] } as any),
          srvIds.length
            ? sb.from("mikrotik_devices").select("id, name").in("id", srvIds)
            : Promise.resolve({ data: [] } as any),
        ]);
        const pkgMap = new Map((pkgRefs.data ?? []).map((r: any) => [r.id, r]));
        const srvMap = new Map((srvRefs.data ?? []).map((r: any) => [r.id, r]));
        const out = (pkgs ?? []).map((p: any) => ({
          ...p,
          isp_packages: pkgMap.get(p.package_id) || null,
          mikrotik_devices: srvMap.get(p.mikrotik_server_id) || null,
        }));
        return json({ packages: out });
      }

      case "update_tariff_selling_rate": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        const { package_id, selling_rate } = payload;
        if (!package_id) return json({ error: "package_id required" }, 400);
        const rate = Number(selling_rate);
        if (!Number.isFinite(rate) || rate < 0) return json({ error: "Invalid rate" }, 400);
        const resellerId =
          tok.type === "reseller_sub"
            ? (tok as any).parent_reseller_id
            : tok.sub;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("tariff_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.tariff_id) return json({ error: "No tariff assigned" }, 403);
        // Fetch row to enforce: must belong to own tariff, and rate >= buy_rate
        const { data: row } = await sb
          .from("reseller_tariff_packages")
          .select("id, tariff_id, buy_rate")
          .eq("id", package_id)
          .maybeSingle();
        if (!row || row.tariff_id !== pop.tariff_id)
          return json({ error: "Package not in your tariff" }, 403);
        if (rate < Number(row.buy_rate || 0))
          return json({ error: `Selling rate cannot be less than buy rate (৳${row.buy_rate})` }, 400);
        const { error: upErr } = await sb
          .from("reseller_tariff_packages")
          .update({ selling_rate: rate })
          .eq("id", package_id);
        if (upErr) return json({ error: upErr.message }, 500);
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("portal-data error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
