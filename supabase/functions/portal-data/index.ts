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

  // Helper: load full client with joined refs (correct schema)
  const loadClient = async () => {
    const { data: client } = await sb
      .from("clients")
      .select(
        "id, name, client_id, username, contact, email, address, present_address, permanent_address, nid_number, photo_url, nid_front_url, nid_back_url, monthly_bill, status, billing_status, joining_date, expire_date, billing_date, speed, connection_type, protocol_type, mac_address, remote_address, server_name, profile, is_online, total_upload, total_download, package_id, zone_id, sub_zone_id, branch_id, father_name, mother_name, date_of_birth, occupation, gender, road_number, house_number, phone_number"
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
        let last_login: string | null = null;
        try {
          const { data: ll } = await sb
            .from("portal_login_log")
            .select("login_at")
            .eq("client_id", tok.sub)
            .eq("status", "success")
            .order("login_at", { ascending: false })
            .range(1, 1)
            .maybeSingle();
          last_login = ll?.login_at || null;
        } catch (_) { /* ignore */ }
        let recent_messages: any[] = [];
        try {
          const { data: rm } = await sb
            .from("customer_messages")
            .select("id, channel, message, recipient, status, created_at")
            .eq("customer_id", tok.sub)
            .order("created_at", { ascending: false })
            .limit(5);
          recent_messages = rm || [];
        } catch (_) { /* ignore */ }
        return json({ client, bills: bills || [], collections: collections || [], notices, balance, last_login, recent_messages });
      }

      case "get_messages": {
        if (tok.type !== "client") return json({ messages: [] });
        const ch = payload?.channel ? String(payload.channel) : null;
        let q = sb
          .from("customer_messages")
          .select("id, channel, message, recipient, status, created_at")
          .eq("customer_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(200);
        if (ch) q = q.eq("channel", ch);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ messages: data || [] });
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

      case "list_available_packages": {
        if (tok.type !== "client") return json({ packages: [] });
        const { data } = await sb
          .from("isp_packages")
          .select("id, name, bandwidth_down, bandwidth_up, price, code")
          .eq("status", "active")
          .order("price", { ascending: true });
        return json({ packages: data || [] });
      }

      case "list_change_requests": {
        if (tok.type !== "client") return json({ requests: [] });
        const { data, error } = await sb
          .from("change_requests")
          .select("id, request_type, old_value, new_value, reason, status, created_at, approved_at")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 500);
        return json({ requests: data || [] });
      }

      case "create_change_request": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const allowedTypes = new Set(["package", "billing_date", "date_extend"]);
        const request_type = String(payload?.request_type || "");
        if (!allowedTypes.has(request_type)) return json({ error: "Invalid type" }, 400);

        const old_value = payload?.old_value != null ? String(payload.old_value).slice(0, 200) : null;
        const new_value = payload?.new_value != null ? String(payload.new_value).slice(0, 200) : null;
        const reason = payload?.reason ? String(payload.reason).slice(0, 500) : null;

        if (!new_value) return json({ error: "Missing new value" }, 400);

        // Validation per type
        if (request_type === "billing_date") {
          const n = Number(new_value);
          if (!n || n < 1 || n > 28) return json({ error: "Day must be 1-28" }, 400);
        }
        if (request_type === "date_extend") {
          if (!reason) return json({ error: "Reason required" }, 400);
          const d = new Date(new_value);
          if (isNaN(d.getTime())) return json({ error: "Invalid date" }, 400);
        }

        // Block duplicate pending of same type
        const { data: pending } = await sb
          .from("change_requests")
          .select("id")
          .eq("client_id", tok.sub)
          .eq("request_type", request_type)
          .eq("status", "pending")
          .limit(1);
        if (pending && pending.length > 0) {
          return json({ error: "একটি pending রিকোয়েস্ট আছে" }, 400);
        }

        // For date_extend: only one approved/pending in last 30 days
        if (request_type === "date_extend") {
          const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
          const { data: recent } = await sb
            .from("change_requests")
            .select("id")
            .eq("client_id", tok.sub)
            .eq("request_type", "date_extend")
            .in("status", ["approved", "pending"])
            .gte("created_at", since)
            .limit(1);
          if (recent && recent.length > 0) {
            return json({ error: "এই মাসে একবারই date extend allowed" }, 400);
          }
        }

        const { error } = await sb.from("change_requests").insert({
          client_id: tok.sub,
          request_type,
          old_value,
          new_value,
          reason,
          status: "pending",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "cancel_change_request": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const id = String(payload?.id || "");
        if (!id) return json({ error: "Missing id" }, 400);
        const { data: row } = await sb
          .from("change_requests")
          .select("id, client_id, status")
          .eq("id", id)
          .maybeSingle();
        if (!row || row.client_id !== tok.sub) return json({ error: "Not found" }, 404);
        if (row.status !== "pending") return json({ error: "Cannot cancel" }, 400);
        const { error } = await sb
          .from("change_requests")
          .update({ status: "cancelled" })
          .eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "get_profile": {
        if (tok.type !== "client") return json({ client: null, requests: [] });
        const { data: client } = await sb
          .from("clients")
          .select("id, name, client_id, username, contact, email, address, present_address, permanent_address, nid_number, photo_url, nid_front_url, nid_back_url, documents, joining_date, expire_date, billing_date, status, package_id, father_name, mother_name, date_of_birth, occupation, gender, road_number, house_number, phone_number, monthly_bill")
          .eq("id", tok.sub)
          .maybeSingle();
        let pkg: any = null;
        if (client?.package_id) {
          const { data: p } = await sb
            .from("isp_packages")
            .select("id, name, bandwidth_down, bandwidth_up, price")
            .eq("id", client.package_id)
            .maybeSingle();
          pkg = p;
        }
        const { data: requests } = await sb
          .from("client_update_requests")
          .select("*")
          .eq("client_id", tok.sub)
          .order("created_at", { ascending: false })
          .limit(20);
        return json({ client: client ? { ...client, package: pkg } : null, requests: requests || [] });
      }

      case "update_profile": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const stringFields = [
          "present_address", "permanent_address", "contact", "email",
          "father_name", "mother_name", "occupation", "gender",
          "road_number", "house_number", "phone_number",
        ];
        const updates: Record<string, any> = {};
        for (const k of stringFields) {
          if (typeof payload[k] === "string") updates[k] = payload[k].slice(0, 500);
        }
        if (typeof payload.date_of_birth === "string" && payload.date_of_birth) {
          updates.date_of_birth = payload.date_of_birth;
        }
        if (!Object.keys(updates).length) return json({ error: "No fields" }, 400);
        const { error } = await sb.from("clients").update(updates).eq("id", tok.sub);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "change_password": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const current = String(payload.current || "");
        const next = String(payload.new || "");
        if (next.length < 6) return json({ error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে" }, 400);
        if (next === current) return json({ error: "নতুন পাসওয়ার্ড পুরাতনের মত হতে পারবে না" }, 400);
        const { data: row } = await sb.from("clients").select("password").eq("id", tok.sub).maybeSingle();
        if (!row) return json({ error: "Client not found" }, 404);
        if ((row.password || "") !== current) return json({ error: "বর্তমান পাসওয়ার্ড সঠিক নয়" }, 400);
        const { error } = await sb.from("clients").update({ password: next }).eq("id", tok.sub);
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
            "id, selling_rate, mikrotik_profile, protocol_type, validity_days, min_activation_days, package_id, mikrotik_server_id"
          )
          .eq("tariff_id", tariffId)
          .eq("status", "active");
        if (error) return json({ error: error.message }, 500);

        const pkgIds = Array.from(new Set((pkgs ?? []).map((p) => p.package_id).filter(Boolean)));
        const srvIds = Array.from(new Set((pkgs ?? []).map((p) => p.mikrotik_server_id).filter(Boolean)));
        const tpIds = (pkgs ?? []).map((p) => p.id);
        const [pkgRefs, srvRefs, pricingRefs] = await Promise.all([
          pkgIds.length
            ? sb.from("isp_packages").select("id, name, bandwidth_down, package_type").in("id", pkgIds)
            : Promise.resolve({ data: [] } as any),
          srvIds.length
            ? sb.from("mikrotik_devices").select("id, name").in("id", srvIds)
            : Promise.resolve({ data: [] } as any),
          tpIds.length
            ? sb
                .from("pop_package_pricing")
                .select("tariff_package_id, pop_selling_rate")
                .eq("branch_manager_id", resellerId)
                .in("tariff_package_id", tpIds)
            : Promise.resolve({ data: [] } as any),
        ]);
        const pkgMap = new Map((pkgRefs.data ?? []).map((r: any) => [r.id, r]));
        const srvMap = new Map((srvRefs.data ?? []).map((r: any) => [r.id, r]));
        const priceMap = new Map(
          (pricingRefs.data ?? []).map((r: any) => [r.tariff_package_id, Number(r.pop_selling_rate ?? 0)]),
        );

        // Auto-seed any missing pricing rows so the POP can edit them later.
        const missing = (pkgs ?? []).filter((p: any) => !priceMap.has(p.id));
        if (missing.length) {
          const seedRows = missing.map((p: any) => ({
            branch_manager_id: resellerId,
            tariff_package_id: p.id,
            pop_selling_rate: Number(p.selling_rate ?? 0),
          }));
          await sb
            .from("pop_package_pricing")
            .upsert(seedRows, { onConflict: "branch_manager_id,tariff_package_id" });
          for (const p of missing) priceMap.set(p.id, Number(p.selling_rate ?? 0));
        }

        const out = (pkgs ?? []).map((p: any) => {
          const adminRate = Number(p.selling_rate ?? 0);
          const popRate = priceMap.get(p.id) ?? adminRate;
          return {
            id: p.id,
            mikrotik_profile: p.mikrotik_profile,
            protocol_type: p.protocol_type,
            validity_days: p.validity_days,
            min_activation_days: p.min_activation_days,
            package_id: p.package_id,
            mikrotik_server_id: p.mikrotik_server_id,
            // POP's buying rate (locked) = Admin's selling_rate
            buy_rate: adminRate,
            admin_selling_rate: adminRate,
            // POP's own selling rate (editable)
            selling_rate: popRate,
            pop_selling_rate: popRate,
            isp_packages: pkgMap.get(p.package_id) || null,
            mikrotik_devices: srvMap.get(p.mikrotik_server_id) || null,
          };
        });
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
        // Validate package belongs to POP's tariff and check Admin selling_rate as the floor.
        const { data: row } = await sb
          .from("reseller_tariff_packages")
          .select("id, tariff_id, selling_rate")
          .eq("id", package_id)
          .maybeSingle();
        if (!row || row.tariff_id !== pop.tariff_id)
          return json({ error: "Package not in your tariff" }, 403);
        const adminRate = Number(row.selling_rate || 0);
        if (rate < adminRate)
          return json({ error: `Selling rate cannot be less than buying rate (৳${adminRate})` }, 400);

        // Upsert POP-specific selling rate (Admin's selling_rate is NOT touched).
        const { error: upErr } = await sb
          .from("pop_package_pricing")
          .upsert(
            {
              branch_manager_id: resellerId,
              tariff_package_id: package_id,
              pop_selling_rate: rate,
            },
            { onConflict: "branch_manager_id,tariff_package_id" },
          );
        if (upErr) return json({ error: upErr.message }, 500);
        return json({ ok: true });
      }

      case "get_client_form_meta": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        if (!resellerId) return json({ error: "No reseller" }, 400);

        const { data: pop } = await sb
          .from("branch_managers")
          .select("id, branch_id, tariff_id, server_id, pop_prefix, pop_code, district_id, upazila_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop) return json({ error: "POP not found" }, 404);

        const branchId = pop.branch_id;
        const tariffId = pop.tariff_id;

        const [
          tariff, district, upazila,
          zones, subZones, boxes,
          connTypes, clientTypes, billingStatuses, protocolTypes,
          mikrotiks, employees,
          tpkgs,
        ] = await Promise.all([
          tariffId
            ? sb.from("reseller_tariffs").select("mikrotik_server_id").eq("id", tariffId).maybeSingle()
            : Promise.resolve({ data: null } as any),
          pop.district_id
            ? sb.from("districts").select("name").eq("id", pop.district_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          pop.upazila_id
            ? sb.from("upazilas").select("name").eq("id", pop.upazila_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          branchId
            ? sb.from("zones").select("id, name").eq("status", "active").eq("branch_id", branchId)
            : Promise.resolve({ data: [] } as any),
          branchId
            ? sb.from("sub_zones").select("id, name, zone_id").eq("status", "active").eq("branch_id", branchId)
            : Promise.resolve({ data: [] } as any),
          branchId
            ? sb.from("boxes").select("id, name, zone_id").eq("status", "active").eq("branch_id", branchId)
            : Promise.resolve({ data: [] } as any),
          sb.from("connection_types_config").select("id, name").eq("status", "active"),
          sb.from("client_types").select("id, name").eq("status", "active"),
          sb.from("billing_statuses").select("id, name").eq("status", "active"),
          sb.from("protocol_types").select("id, name").eq("status", "active"),
          sb.from("mikrotik_devices").select("id, name"),
          branchId
            ? sb.from("employees").select("id, name").eq("status", "active").eq("branch_id", branchId)
            : Promise.resolve({ data: [] } as any),
          tariffId
            ? sb.from("reseller_tariff_packages")
                .select("id, package_id, selling_rate, mikrotik_profile, mikrotik_server_id, isp_packages(id, name, bandwidth_down, price)")
                .eq("tariff_id", tariffId)
            : Promise.resolve({ data: [] } as any),
        ]);

        const defaultServerId =
          (tariff as any)?.data?.mikrotik_server_id || pop.server_id || null;

        // POP-specific selling rates
        const tpkgRows = ((tpkgs as any).data || []).filter((p: any) => p.isp_packages);
        let popPriceMap = new Map<string, number>();
        if (tpkgRows.length) {
          const { data: pricing } = await sb
            .from("pop_package_pricing")
            .select("tariff_package_id, pop_selling_rate")
            .eq("branch_manager_id", resellerId)
            .in("tariff_package_id", tpkgRows.map((r: any) => r.id));
          popPriceMap = new Map(
            (pricing || []).map((r: any) => [r.tariff_package_id, Number(r.pop_selling_rate ?? 0)]),
          );
        }

        const packages = tpkgRows.map((p: any) => ({
          id: p.isp_packages.id,
          name: p.isp_packages.name,
          bandwidth_down: p.isp_packages.bandwidth_down,
          price: popPriceMap.get(p.id) ?? Number(p.selling_rate ?? 0),
          mikrotik_profile: p.mikrotik_profile || null,
          mikrotik_server_id: p.mikrotik_server_id || null,
        }));

        // Generate next client code preview using the same pattern as set_client_code trigger
        // Format: <pop_code>-<6-digit-seq>. We don't consume the sequence here — use COUNT-based suggestion.
        const popPrefix = pop.pop_prefix || pop.pop_code || "0000";
        // Find last code matching prefix to suggest next
        const { data: lastClient } = await sb
          .from("clients")
          .select("client_id")
          .like("client_id", `${popPrefix}-%`)
          .order("client_id", { ascending: false })
          .limit(1)
          .maybeSingle();
        let nextNum = 1;
        if (lastClient?.client_id) {
          const m = String(lastClient.client_id).match(/-(\d+)$/);
          if (m) nextNum = parseInt(m[1], 10) + 1;
        }
        const nextClientCode = `${popPrefix}-${String(nextNum).padStart(6, "0")}`;

        // Server name lookup
        let serverName: string | null = null;
        if (defaultServerId) {
          const srv = ((mikrotiks as any).data || []).find((m: any) => m.id === defaultServerId);
          serverName = srv?.name || null;
        }

        return json({
          branchId,
          tariffId,
          popPrefix,
          nextClientCode,
          districtName: (district as any)?.data?.name || "",
          upazilaName: (upazila as any)?.data?.name || "",
          defaultServerId,
          defaultServerName: serverName,
          zones: (zones as any).data || [],
          subZones: (subZones as any).data || [],
          boxes: (boxes as any).data || [],
          connectionTypes: (connTypes as any).data || [],
          clientTypes: (clientTypes as any).data || [],
          billingStatuses: (billingStatuses as any).data || [],
          protocolTypes: (protocolTypes as any).data || [],
          mikrotiks: (mikrotiks as any).data || [],
          employees: (employees as any).data || [],
          packages,
        });
      }

      case "check_client_code_unique": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        const code = String(payload.client_id || "").trim();
        if (!code) return json({ unique: true });
        const { data } = await sb
          .from("clients")
          .select("id")
          .eq("client_id", code)
          .limit(1);
        return json({ unique: !data || data.length === 0 });
      }

      case "create_client": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("branch_id, district_id, upazila_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const p = payload || {};
        const { mobile: legacyMobile, ...safePayload } = p;
        if (!p.name || !p.client_id) return json({ error: "নাম ও ক্লায়েন্ট কোড আবশ্যক" }, 400);

        // Force scope to this POP's branch
        const insertRow: any = {
          ...safePayload,
          contact: p.contact ?? legacyMobile ?? null,
          branch_id: pop.branch_id,
          district_id: pop.district_id || null,
          upazila_id: pop.upazila_id || null,
          owner_scope: "pop",
        };

        const { data: inserted, error } = await sb
          .from("clients")
          .insert(insertRow)
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 500);

        // Auto-generate first billing row (prorated)
        if (inserted?.id && p.billing_status === "Active" && Number(p.monthly_bill) > 0) {
          const joinStr = p.joining_date || new Date().toISOString().slice(0, 10);
          const join = new Date(joinStr + "T00:00:00");
          const y = join.getFullYear();
          const m = join.getMonth() + 1;
          const totalDays = new Date(y, m, 0).getDate();
          const joinDay = join.getDate();
          const daysRemaining = totalDays - joinDay + 1;
          const monthly = Number(p.monthly_bill || 0);
          const isProrated = joinDay > 1;
          const amount = isProrated
            ? Math.round((monthly / totalDays) * daysRemaining * 100) / 100
            : monthly;
          const monthKey = `${y}-${String(m).padStart(2, "0")}`;
          const billId = `BILL-${p.client_id}-${monthKey}`;
          await sb.from("billing").insert({
            bill_id: billId,
            client_id: inserted.id,
            month: `${monthKey}-01`,
            amount,
            due: amount,
            status: "unpaid",
            generated: true,
            branch_id: pop.branch_id,
          });
        }

        return json({ ok: true, id: inserted?.id });
      }

      case "list_pop_clients": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Not allowed" }, 403);
        }
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const search = String(payload.search || "").trim();
        const minimal = !!payload.minimal;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("branch_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ clients: [] });

        let q: any = sb
          .from("clients")
          .select(
            minimal
              ? "id, client_id, name, contact, username, monthly_bill, branch_id"
              : "*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down, price), mikrotik_device:mikrotik_devices!clients_mikrotik_id_fkey(name)"
          )
          .eq("branch_id", pop.branch_id)
          .neq("status", "left")
          .neq("billing_status", "Left")
          .order("created_at", { ascending: false });

        if (search) {
          q = q.or(`client_id.ilike.%${search}%,name.ilike.%${search}%,contact.ilike.%${search}%,username.ilike.%${search}%`).limit(20);
        }

        const { data: clients, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ clients: clients || [] });
      }

      case "get_pop_client_profile": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Not allowed" }, 403);
        }
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const clientId = String(payload.client_id || "");
        if (!clientId) return json({ error: "Client is required" }, 400);

        const { data: pop } = await sb
          .from("branch_managers")
          .select("branch_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const { data: client, error: cErr } = await sb
          .from("clients")
          .select(`
            *,
            zone:zones(name),
            sub_zone:sub_zones(name),
            package:isp_packages(name),
            box:boxes(name),
            billing!billing_client_id_fkey(id, bill_id, month, amount, paid, due, discount, advance, vat, status, pay_date, created_at),
            bill_collections!bill_collections_client_id_fkey(id, amount, discount, vat, payment_method, note, status, created_at, transaction_id, received_by)
          `)
          .eq("id", clientId)
          .maybeSingle();
        if (cErr) return json({ error: cErr.message }, 500);
        if (!client) return json({ error: "Client not found" }, 404);
        if (client.branch_id !== pop.branch_id) {
          return json({ error: "Client not in your POP" }, 403);
        }

        const [traffic, changes, tickets, history] = await Promise.all([
          sb.from("client_traffic_monthly")
            .select("*")
            .eq("client_id", clientId)
            .order("month", { ascending: false })
            .limit(12),
          sb.from("change_requests")
            .select("*")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false })
            .limit(20),
          sb.from("support_tickets")
            .select("*")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false })
            .limit(20),
          sb.from("billing_history")
            .select("*")
            .eq("client_id", clientId)
            .order("changed_at", { ascending: false }),
        ]);

        return json({
          client,
          traffic: traffic.data || [],
          change_requests: changes.data || [],
          support_tickets: tickets.data || [],
          bill_history: history.data || [],
        });
      }

      case "list_pop_billing_clients": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Not allowed" }, 403);
        }
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("branch_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ clients: [] });

        const { data: clients, error } = await sb
          .from("clients")
          .select(`
            id, client_id, name, contact, username, remote_address, status,
            client_type, connection_type, monthly_bill, expire_date, speed,
            server_name, mac_address, protocol_type, profile, password,
            mikrotik_id, mikrotik_status, is_vip, billing_date, is_online,
            zone_id, sub_zone_id, box_id, package_id, email, billing_status,
            zone:zones(name),
            package:isp_packages(name),
            mikrotik_device:mikrotik_devices!clients_mikrotik_id_fkey(name),
            billing!billing_client_id_fkey(id, bill_id, month, amount, paid, due, discount, advance, vat, status, pay_date)
          `)
          .eq("branch_id", pop.branch_id)
          .eq("status", "active")
          .ilike("billing_status", "active")
          .gt("monthly_bill", 0)
          .order("client_id", { ascending: true });

        if (error) return json({ error: error.message }, 500);
        return json({ clients: clients || [] });
      }

      case "ensure_pop_client_bill": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const monthKey = String(payload.month || new Date().toISOString().slice(0, 7));
        const monthStart = `${monthKey}-01`;
        const clientId = String(payload.client_id || "");
        if (!clientId) return json({ error: "Client is required" }, 400);

        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const { data: client } = await sb
          .from("clients")
          .select("id, client_id, monthly_bill, branch_id")
          .eq("id", clientId)
          .eq("branch_id", pop.branch_id)
          .maybeSingle();
        if (!client) return json({ error: "Client not found" }, 404);

        const { data: existing } = await sb
          .from("billing")
          .select("id")
          .eq("client_id", clientId)
          .gte("month", monthStart)
          .lt("month", new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1).toISOString().slice(0, 10))
          .limit(1)
          .maybeSingle();
        if (existing?.id) return json({ ok: true, created: false, billing_id: existing.id });

        const amount = Number(client.monthly_bill || 0);
        if (amount <= 0) return json({ error: "Monthly bill is not set" }, 400);

        const { data: inserted, error } = await sb.from("billing").insert({
          bill_id: `BILL-${client.client_id}-${monthKey}`,
          client_id: client.id,
          branch_id: pop.branch_id,
          month: monthStart,
          amount,
          due: amount,
          paid: 0,
          status: "unpaid",
          generated: true,
        }).select("id").single();
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, created: true, billing_id: inserted?.id || null });
      }

      case "list_pop_daily_collections": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const fromDate = String(payload.fromDate || new Date().toISOString().slice(0, 10));
        const toDate = String(payload.toDate || new Date().toISOString().slice(0, 10));
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ collections: [] });
        const { data: branchClients } = await sb.from("clients").select("id").eq("branch_id", pop.branch_id);
        const clientIds = (branchClients || []).map((c: any) => c.id);
        if (!clientIds.length) return json({ collections: [] });
        const { data, error } = await sb
          .from("bill_collections")
          .select(`
            *,
            client:clients!inner(id, client_id, name, contact, username, monthly_bill, branch_id, owner_scope),
            billing:billing(id, month, amount, paid, due, status)
          `)
          .in("client_id", clientIds)
          .gte("created_at", `${fromDate}T00:00:00`)
          .lte("created_at", `${toDate}T23:59:59`)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ collections: data || [] });
      }

      case "receive_pop_bill": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);
        const clientId = String(payload.client_id || "");
        if (!clientId) return json({ error: "Client is required" }, 400);
        const amount = Number(payload.amount || 0);
        const discount = Number(payload.discount || 0);
        const vat = Number(payload.vat || 0);
        const totalReceived = amount - discount + vat;
        if (totalReceived <= 0) return json({ error: "Invalid amount" }, 400);
        const receivedDate = String(payload.received_date || new Date().toISOString().slice(0, 10));
        const paymentMethod = payload.payment_method || "cash";
        const { data: client } = await sb
          .from("clients")
          .select("id, name, client_id, username, monthly_bill, expire_date, billing_date, package_id, mikrotik_id")
          .eq("id", clientId)
          .eq("branch_id", pop.branch_id)
          .maybeSingle();
        if (!client) return json({ error: "Client not found" }, 404);

        let bill = null as any;
        if (payload.billing_id) {
          const { data } = await sb.from("billing").select("*").eq("id", payload.billing_id).eq("client_id", clientId).maybeSingle();
          bill = data;
        } else {
          const monthStart = `${receivedDate.slice(0, 7)}-01`;
          const nextMonth = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1).toISOString().slice(0, 10);
          const { data } = await sb.from("billing").select("*").eq("client_id", clientId).gte("month", monthStart).lt("month", nextMonth).order("month", { ascending: false }).limit(1).maybeSingle();
          bill = data;
        }

        const monthlyBill = Number(bill?.amount ?? client.monthly_bill ?? 0);
        const alreadyPaid = Number(bill?.paid || 0);
        const newPaid = alreadyPaid + totalReceived;
        const newDue = Math.max(0, monthlyBill - newPaid);
        const newAdvance = newPaid > monthlyBill ? newPaid - monthlyBill : 0;
        const newStatus = newDue <= 0 ? "paid" : "partial";

        if (bill?.id) {
          const { error } = await sb.from("billing").update({
            paid: newPaid,
            due: newDue,
            advance: newAdvance,
            status: newStatus,
            pay_date: receivedDate,
            payment_method: paymentMethod,
            collected_by: payload.received_by || tok.sub,
            discount,
            vat,
          }).eq("id", bill.id);
          if (error) return json({ error: error.message }, 500);
        }

        const { error: collectionError } = await sb.from("bill_collections").insert({
          client_id: client.id,
          billing_id: bill?.id || null,
          amount: totalReceived,
          discount,
          vat,
          payment_method: paymentMethod,
          note: payload.note || null,
          transaction_id: payload.transaction_id || null,
          received_by: payload.received_by || tok.sub,
          status: "approved",
        });
        if (collectionError) return json({ error: collectionError.message }, 500);

        const { error: incomeError } = await sb.from("income_entries").insert({
          amount: totalReceived,
          source: "bill_collection",
          description: `বিল কালেকশন — ${client.name} (${client.client_id || ""})`,
          income_date: receivedDate,
          month: receivedDate.slice(0, 7),
          client_id: client.id,
          branch_id: pop.branch_id,
          payment_method: paymentMethod,
          reference: bill?.id || null,
          received_by: payload.received_by || tok.sub,
          status: "approved",
        });
        if (incomeError) return json({ error: incomeError.message }, 500);

        if (payload.set_next_billing) {
          let tariffType: "custom" | "date_to_date" = "date_to_date";
          let validityDays = 0;
          if (client.package_id) {
            const { data: tpkg } = await sb
              .from("reseller_tariff_packages")
              .select("validity_days, reseller_tariffs(tariff_type)")
              .eq("package_id", client.package_id)
              .limit(1)
              .maybeSingle();
            const tt = (tpkg as any)?.reseller_tariffs?.tariff_type;
            if (tt === "custom") {
              tariffType = "custom";
              validityDays = Number((tpkg as any)?.validity_days || 30);
            }
          }

          let newExpire: string;
          if (tariffType === "custom" && validityDays > 0) {
            const base = client.expire_date ? new Date(client.expire_date) : new Date(receivedDate);
            base.setDate(base.getDate() + validityDays);
            newExpire = base.toISOString().slice(0, 10);
          } else {
            const bd = (client as any).billing_date || 1;
            const now = new Date(receivedDate);
            let year = now.getFullYear();
            let month = now.getMonth() + 2;
            if (month > 12) { month -= 12; year++; }
            const lastDay = new Date(year, month, 0).getDate();
            const day = Math.min(Number(bd) || 1, lastDay);
            newExpire = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          }
          await sb.from("clients").update({ expire_date: newExpire }).eq("id", client.id);
        }

        return json({ ok: true });
      }

      case "list_pop_client_schedulers": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ schedulers: [] });
        const { data, error } = await sb
          .from("client_schedulers")
          .select("*, clients:client_id(client_id, name, contact, username, branch_id, zones:zone_id(name))")
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ schedulers: (data || []).filter((s: any) => s.clients?.branch_id === pop.branch_id) });
      }

      case "create_pop_scheduler": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);
        const clientId = String(payload.client_id || "");
        if (!clientId) return json({ error: "Client is required" }, 400);
        const { data: client } = await sb.from("clients").select("id, branch_id").eq("id", clientId).maybeSingle();
        if (!client || client.branch_id !== pop.branch_id) return json({ error: "Client not allowed" }, 403);

        let executionTime = payload.execution_time || null;
        const { data: popSetting } = await sb.from("system_settings").select("setting_value").eq("setting_key", `pop:${pop.branch_id}:client_billing_settings`).maybeSingle();
        const settings: any = popSetting?.setting_value || {};
        const statusTimes = settings?.statusTimes || {};
        if (!executionTime && payload.scheduler_type === "status_scheduler") {
          executionTime = statusTimes?.[String(payload.schedule_info || "").toLowerCase()] || null;
        }
        if (!executionTime && payload.scheduler_type === "package_scheduler") {
          executionTime = "00:05";
        }

        const { error } = await sb.from("client_schedulers").insert({
          client_id: clientId,
          scheduler_type: payload.scheduler_type || "package_scheduler",
          previous_info: payload.previous_info || null,
          schedule_info: payload.schedule_info || null,
          remarks: payload.remarks || null,
          schedule_date: payload.schedule_date || null,
          package_id: payload.package_id || null,
          package_rate: payload.package_rate ?? null,
          server_id: payload.server_id || null,
          protocol_type: payload.protocol_type || null,
          profile_speed: payload.profile_speed || null,
          execution_time: executionTime,
          created_by: tok.sub,
          status: "pending",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "cancel_pop_scheduler": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);
        const { data: row } = await sb.from("client_schedulers").select("id, clients:client_id(branch_id)").eq("id", payload.id).maybeSingle();
        if (!(row as any)?.clients || (row as any).clients.branch_id !== pop.branch_id) return json({ error: "Not allowed" }, 403);
        const { error } = await sb.from("client_schedulers").update({ status: "cancelled" }).eq("id", payload.id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "create_employee": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub")
          return json({ error: "Not allowed" }, 403);
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("branch_id")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const p = payload || {};
        if (!p.name) return json({ error: "Name আবশ্যক" }, 400);

        const employee_id = `EMP-${Date.now().toString().slice(-8)}`;
        const empRow: any = {
          ...p,
          employee_id,
          branch_id: pop.branch_id,
        };
        // Strip sub-user-only fields before insert
        const hasAccess = !!p.has_user_access;
        const subUsername = p.user_username;
        const subPassword = p.user_password;
        const subPermissions = p.user_permissions || {};

        const { data: emp, error: empErr } = await sb
          .from("employees")
          .insert(empRow)
          .select("id")
          .single();
        if (empErr) return json({ error: empErr.message }, 500);

        if (hasAccess && subUsername && subPassword) {
          const { data: sub, error: subErr } = await sb
            .from("branch_managers")
            .insert({
              name: p.name,
              username: subUsername,
              password: subPassword,
              email: p.email || null,
              contact: p.personal_phone || p.phone || null,
              branch_id: pop.branch_id,
              pop_type: "reseller_sub",
              parent_reseller_id: resellerId,
              permissions: subPermissions,
              portal_enabled: true,
              status: "active",
            } as any)
            .select("id")
            .single();
          if (subErr) return json({ error: subErr.message }, 500);
          await sb.from("employees").update({ sub_user_id: sub.id } as any).eq("id", emp.id);
        }

        return json({ ok: true, id: emp.id });
      }

      case "get_daily_usage": {
        if (tok.type !== "client") return json({ days: [] });
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const { data: logs } = await sb
          .from("client_traffic_logs")
          .select("upload_bytes, download_bytes, recorded_at")
          .eq("client_id", tok.sub)
          .gte("recorded_at", start.toISOString())
          .order("recorded_at", { ascending: true })
          .limit(10000);
        const map = new Map<string, { up: number; dn: number }>();
        let prevUp: number | null = null;
        let prevDn: number | null = null;
        for (const r of logs || []) {
          const up = Number(r.upload_bytes || 0);
          const dn = Number(r.download_bytes || 0);
          const dUp = prevUp === null || up < prevUp ? (prevUp === null ? 0 : up) : up - prevUp;
          const dDn = prevDn === null || dn < prevDn ? (prevDn === null ? 0 : dn) : dn - prevDn;
          const day = new Date(r.recorded_at).toISOString().slice(0, 10);
          const cur = map.get(day) || { up: 0, dn: 0 };
          cur.up += Math.max(0, dUp);
          cur.dn += Math.max(0, dDn);
          map.set(day, cur);
          prevUp = up;
          prevDn = dn;
        }
        const days = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, v]) => ({ day, up: v.up, dn: v.dn }));
        return json({ days });
      }

      case "get_monthly_usage": {
        if (tok.type !== "client") return json({ months: [] });
        const { data } = await sb
          .from("client_traffic_monthly")
          .select("month, total_upload, total_download")
          .eq("client_id", tok.sub)
          .order("month", { ascending: false })
          .limit(12);
        return json({ months: data || [] });
      }

      // ===== POP MikroTik scoped reads =====
      case "get_pop_mikrotik_servers":
      case "get_pop_mikrotik_users":
      case "get_pop_mikrotik_bulk_candidates": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Forbidden" }, 403);
        }
        const t: any = tok;
        const popId: string = t.type === "reseller_sub" ? t.parent_reseller_id : t.sub;
        if (!popId) return json({ error: "POP not resolved" }, 400);

        // Resolve POP record (branch_id, tariff_id, etc.)
        const { data: pop } = await sb
          .from("branch_managers")
          .select("id, name, pop_code, branch_id, tariff_id")
          .eq("id", popId)
          .maybeSingle();
        const branchId: string | null = pop?.branch_id || null;
        const tariffId: string | null = pop?.tariff_id || null;

        // Resolve visible MikroTik device ids:
        //  - branch_id matches POP branch
        //  - assigned_to_pop_id = popId
        //  - historical: any mikrotik_clients.transferred_to_mikrotik_id where transferred_to_pop_id = popId
        const { data: directDevices } = await sb
          .from("mikrotik_devices")
          .select("id, name, ip_address, status, branch_id, assigned_to_pop_id")
          .order("name");
        const visibleDevices = (directDevices || []).filter((d: any) =>
          (branchId && d.branch_id === branchId) || d.assigned_to_pop_id === popId
        );
        let visibleIds = new Set<string>(visibleDevices.map((d: any) => d.id));

        const { data: transferRows } = await sb
          .from("mikrotik_clients")
          .select("transferred_to_mikrotik_id")
          .eq("transferred_to_pop_id", popId)
          .not("transferred_to_mikrotik_id", "is", null);
        const transferredIds = new Set<string>(
          (transferRows || []).map((r: any) => r.transferred_to_mikrotik_id).filter(Boolean)
        );
        // Add transferred device rows we don't already have
        const missingIds = [...transferredIds].filter((id) => !visibleIds.has(id));
        if (missingIds.length > 0) {
          const { data: extra } = await sb
            .from("mikrotik_devices")
            .select("id, name, ip_address, status, branch_id, assigned_to_pop_id")
            .in("id", missingIds);
          (extra || []).forEach((d: any) => {
            visibleDevices.push(d);
            visibleIds.add(d.id);
          });
        }

        if (action === "get_pop_mikrotik_servers") {
          return json({
            pop: pop || null,
            servers: visibleDevices,
          });
        }

        // Common: load tariff packages + zones for the POP (used by both users + bulk pages)
        const [tariffRes, zonesRes] = await Promise.all([
          tariffId
            ? sb
                .from("reseller_tariff_packages")
                .select("id, package_id, selling_rate, isp_packages(id, name, bandwidth_down)")
                .eq("tariff_id", tariffId)
                .eq("status", "active")
            : Promise.resolve({ data: [] } as any),
          branchId
            ? sb.from("zones").select("id, name").eq("branch_id", branchId).order("name")
            : Promise.resolve({ data: [] } as any),
        ]);

        if (action === "get_pop_mikrotik_users") {
          const mtId: string | undefined = payload.mikrotik_id;
          if (!mtId) return json({ users: [], tariff_packages: tariffRes.data || [], zones: zonesRes.data || [] });
          const dev = visibleDevices.find((d: any) => d.id === mtId);
          if (!dev) return json({ error: "MikroTik not visible to this POP" }, 403);

          // POP-scoped visibility rule: a MikroTik PPP entry is visible to this POP only if
          //   (a) it was transferred TO this POP (transferred_to_pop_id = popId, on this device), OR
          //   (b) it is linked to a client whose branch_id = this POP's branch_id.
          // We do NOT show every PPP entry on the device — those belong to admin / other POPs.

          // (a) transferred-in candidates on this device
          const { data: transferredRows } = await sb
            .from("mikrotik_clients")
            .select("*")
            .eq("transferred_to_pop_id", popId)
            .eq("transferred_to_mikrotik_id", mtId)
            .order("name");

          // (b) entries on this device whose linked client belongs to this POP's branch
          let linkedRows: any[] = [];
          if (branchId) {
            const { data: rowsOnDevice } = await sb
              .from("mikrotik_clients")
              .select("*")
              .or(`mikrotik_id.eq.${mtId},transferred_to_mikrotik_id.eq.${mtId}`)
              .not("linked_client_id", "is", null);
            const ids = (rowsOnDevice || []).map((r: any) => r.linked_client_id).filter(Boolean);
            if (ids.length > 0) {
              const { data: ownClients } = await sb
                .from("clients")
                .select("id")
                .in("id", ids)
                .eq("branch_id", branchId);
              const ownSet = new Set((ownClients || []).map((c: any) => c.id));
              linkedRows = (rowsOnDevice || []).filter((r: any) => ownSet.has(r.linked_client_id));
            }
          }

          // Merge & dedupe
          const seen = new Set<string>();
          const users: any[] = [];
          for (const r of [...(transferredRows || []), ...linkedRows]) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            users.push(r);
          }
          users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

          return json({
            users,
            pop_id: popId,
            tariff_packages: tariffRes.data || [],
            zones: zonesRes.data || [],
          });
        }

        // get_pop_mikrotik_bulk_candidates: only PPP entries explicitly transferred to this POP
        // and not yet converted into a billing client. We do NOT expose admin's untransferred
        // users here, even if the device is branch-scoped.
        const { data: bulkRows } = await sb
          .from("mikrotik_clients")
          .select("id, name, password, profile, caller_id, remote_address, service, mikrotik_id, transferred_to_mikrotik_id, transferred_to_pop_id, linked_client_id")
          .is("linked_client_id", null)
          .eq("transferred_to_pop_id", popId)
          .order("name");
        return json({
          users: bulkRows || [],
          tariff_packages: tariffRes.data || [],
          zones: zonesRes.data || [],
          branch_id: branchId,
        });
      }

      case "get_pop_allotted_areas": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Forbidden" }, 403);
        }
        const popId = tok.type === "reseller_sub"
          ? (tok as any).parent_reseller_id
          : tok.sub;
        const mode = String(payload.mode || "district");

        const { data: pop } = await sb
          .from("branch_managers")
          .select("district_id, upazila_id")
          .eq("id", popId)
          .maybeSingle();

        const { data: assignments } = await sb
          .from("pop_district_assignments")
          .select("district_id, upazila_ids")
          .eq("branch_manager_id", popId);

        const districtIds = Array.from(
          new Set([
            ...(assignments || []).map((a: any) => a.district_id),
            ...(pop?.district_id ? [pop.district_id] : []),
          ]),
        );
        const allUpazilaIds = Array.from(
          new Set([
            ...(assignments || []).flatMap((a: any) => a.upazila_ids || []),
            ...(pop?.upazila_id ? [pop.upazila_id] : []),
          ]),
        );

        const [districtsRes, upazilasRes] = await Promise.all([
          districtIds.length
            ? sb.from("districts").select("id, name, code").in("id", districtIds)
            : Promise.resolve({ data: [] } as any),
          allUpazilaIds.length
            ? sb.from("upazilas").select("id, name, district_id").in("id", allUpazilaIds)
            : Promise.resolve({ data: [] } as any),
        ]);
        const districtMap = new Map((districtsRes.data || []).map((d: any) => [d.id, d]));
        const upazilaMap = new Map((upazilasRes.data || []).map((u: any) => [u.id, u]));

        if (mode === "district") {
          const rows = (assignments || []).map((a: any) => {
            const d: any = districtMap.get(a.district_id);
            return {
              id: a.district_id,
              name: d?.name || "—",
              code: d?.code || "—",
              upazilaCount: (a.upazila_ids || []).length,
              isDefault: a.district_id === pop?.district_id,
            };
          });
          // Ensure default district is shown even if no assignment row
          if (pop?.district_id && !rows.find((r: any) => r.id === pop.district_id)) {
            const d: any = districtMap.get(pop.district_id);
            rows.unshift({
              id: pop.district_id,
              name: d?.name || "—",
              code: d?.code || "—",
              upazilaCount: pop?.upazila_id ? 1 : 0,
              isDefault: true,
            });
          }
          return json({ rows });
        }

        // upazila mode
        const upazilaRows: any[] = [];
        const seen = new Set<string>();
        for (const a of assignments || []) {
          for (const uid of a.upazila_ids || []) {
            if (seen.has(uid)) continue;
            seen.add(uid);
            const u: any = upazilaMap.get(uid);
            const d: any = u ? districtMap.get(u.district_id) : null;
            upazilaRows.push({
              id: uid,
              name: u?.name || "—",
              districtName: d?.name || "—",
              isDefault: uid === pop?.upazila_id,
            });
          }
        }
        if (pop?.upazila_id && !seen.has(pop.upazila_id)) {
          const u: any = upazilaMap.get(pop.upazila_id);
          const d: any = u ? districtMap.get(u.district_id) : null;
          upazilaRows.unshift({
            id: pop.upazila_id,
            name: u?.name || "—",
            districtName: d?.name || "—",
            isDefault: true,
          });
        }
        return json({ rows: upazilaRows });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("portal-data error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
