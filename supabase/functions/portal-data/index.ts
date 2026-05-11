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

function isPopScopedToken(tok: PortalToken | null): boolean {
  if (!tok) return false;
  if (tok.type === "reseller" || tok.type === "reseller_sub") return true;
  return tok.type === "bw_customer";
}

function allowPanelOrPop(tok: PortalToken | null): boolean {
  return !!tok && (tok.type === "reseller" || tok.type === "reseller_sub" || tok.type === "bw_customer");
}

/**
 * Unified scope resolver — works for POP admin (reseller/reseller_sub) and BW panel customers.
 * Returns `{ branchId, popId, isBw, panelActive, tariffId, pop }`.
 * For BW: popId is null (no branch_managers row), tariffId is null (no admin-defined tariff).
 */
async function getScope(sb: ReturnType<typeof createClient>, tok: PortalToken) {
  if (tok.type === "bw_customer") {
    const ctx = await resolvePopContext(sb, tok);
    return {
      branchId: ctx.branchId as string | null,
      popId: null as string | null,
      isBw: true,
      panelActive: ctx.panelActive,
      tariffId: null as string | null,
      pop: null as any,
    };
  }
  if (tok.type === "reseller" || tok.type === "reseller_sub") {
    const popId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
    const { data: pop } = await sb
      .from("branch_managers")
      .select("id, name, branch_id, tariff_id, pop_code, pop_prefix, district_id, upazila_id, server_id")
      .eq("id", popId)
      .maybeSingle();
    return {
      branchId: (pop as any)?.branch_id || null,
      popId,
      isBw: false,
      panelActive: true,
      tariffId: (pop as any)?.tariff_id || null,
      pop,
    };
  }
  return { branchId: null, popId: null, isBw: false, panelActive: false, tariffId: null, pop: null };
}

async function resolvePopContext(sb: ReturnType<typeof createClient>, tok: PortalToken) {
  if (tok.type === "bw_customer") {
    const { data: customer } = await sb
      .from("bw_sale_customers")
      .select("id, customer_name, panel_access_enabled, panel_subscription_expires_at, panel_branch_id")
      .eq("id", tok.sub)
      .maybeSingle();

    const isActive = !!customer?.panel_access_enabled
      && !!customer?.panel_subscription_expires_at
      && new Date(customer.panel_subscription_expires_at).getTime() > Date.now();

    return {
      popId: tok.sub,
      branchId: customer?.panel_branch_id || null,
      isBwPanel: true,
      panelActive: isActive,
      customer,
    };
  }

  const popId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
  return {
    popId,
    branchId: null,
    isBwPanel: false,
    panelActive: true,
    customer: null,
  };
}

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

      case "client_get_recharge_quote": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const { data: client } = await sb
          .from("clients")
          .select("id, expire_date, package_id, monthly_bill")
          .eq("id", tok.sub)
          .maybeSingle();
        if (!client) return json({ error: "Client not found" }, 404);
        const { data: cost, error: cErr } = await sb.rpc(
          "pop_resolve_client_package_cost",
          { p_client_id: tok.sub },
        );
        if (cErr) return json({ error: cErr.message }, 500);
        const row = Array.isArray(cost) ? cost[0] : cost;
        const buy_price = Number(row?.buy_price ?? 0);
        const validity_days = Number(row?.validity_days ?? 30);
        const min_activation_days = Number(row?.min_activation_days ?? 1);
        const daily_rate = validity_days > 0 ? buy_price / validity_days : 0;
        const today = new Date().toISOString().slice(0, 10);
        const exp = client.expire_date as string | null;
        const can_recharge = !exp || exp <= today;
        return json({
          buy_price,
          validity_days,
          min_activation_days,
          daily_rate,
          expire_date: exp,
          can_recharge,
        });
      }

      case "client_create_recharge_payment": {
        if (tok.type !== "client") return json({ error: "Not allowed" }, 403);
        const { days, payment_method, transaction_id, sender_number } = payload || {};
        const nDays = Math.floor(Number(days || 0));
        if (!nDays || nDays < 1) return json({ error: "Days দিন" }, 400);
        const { data: client } = await sb
          .from("clients")
          .select("id, expire_date")
          .eq("id", tok.sub)
          .maybeSingle();
        if (!client) return json({ error: "Client not found" }, 404);
        const today = new Date().toISOString().slice(0, 10);
        const exp = client.expire_date as string | null;
        if (exp && exp > today) {
          return json({ error: "এখনো expire হয়নি — recharge করার দরকার নেই" }, 400);
        }
        const { data: cost, error: cErr } = await sb.rpc(
          "pop_resolve_client_package_cost",
          { p_client_id: tok.sub },
        );
        if (cErr) return json({ error: cErr.message }, 500);
        const row = Array.isArray(cost) ? cost[0] : cost;
        const buy_price = Number(row?.buy_price ?? 0);
        const validity_days = Number(row?.validity_days ?? 30);
        const min_activation_days = Number(row?.min_activation_days ?? 1);
        if (nDays < min_activation_days) {
          return json({ error: `Minimum ${min_activation_days} দিন recharge করতে হবে` }, 400);
        }
        const daily_rate = validity_days > 0 ? buy_price / validity_days : 0;
        const amount = Math.round(daily_rate * nDays * 100) / 100;
        const { data: pr, error: prErr } = await sb
          .from("public_payment_requests")
          .insert({
            client_id: tok.sub,
            amount,
            method: payment_method || "manual",
            trx_id: transaction_id || null,
            sender_number: sender_number || null,
            note: `Client self-recharge ${nDays} day(s)`,
            status: transaction_id ? "pending" : "initiated",
            purpose: "client_recharge",
            recharge_days: nDays,
          })
          .select("id")
          .maybeSingle();
        if (prErr) return json({ error: prErr.message }, 500);
        return json({ ok: true, request_id: pr?.id, amount, days: nDays });
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
        if (!allowPanelOrPop(tok)) return json({ error: "Not allowed" }, 403);
        const scope = await getScope(sb, tok);
        if (scope.isBw && !scope.panelActive) return json({ error: "প্যানেল সাবস্ক্রিপশন এক্সপায়ার্ড" }, 403);
        const branchId = scope.branchId;
        if (!branchId) return json({ error: "POP branch পাওয়া যায়নি" }, 400);
        const tariffId = scope.tariffId;
        const pop = scope.pop || {};

        const [
          tariff, district, upazila,
          zones, subZones, boxes,
          connTypes, clientTypes, billingStatuses, protocolTypes,
          mikrotiks, employees,
          tpkgs,
          allPackages,
        ] = await Promise.all([
          tariffId
            ? sb.from("reseller_tariffs").select("mikrotik_server_id").eq("id", tariffId).maybeSingle()
            : Promise.resolve({ data: null } as any),
          (pop as any).district_id
            ? sb.from("districts").select("name").eq("id", (pop as any).district_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          (pop as any).upazila_id
            ? sb.from("upazilas").select("name").eq("id", (pop as any).upazila_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          sb.from("zones").select("id, name").eq("status", "active").eq("branch_id", branchId),
          sb.from("sub_zones").select("id, name, zone_id").eq("status", "active").eq("branch_id", branchId),
          sb.from("boxes").select("id, name, zone_id").eq("status", "active").eq("branch_id", branchId),
          sb.from("connection_types_config").select("id, name").eq("status", "active"),
          sb.from("client_types").select("id, name").eq("status", "active"),
          sb.from("billing_statuses").select("id, name").eq("status", "active"),
          sb.from("protocol_types").select("id, name").eq("status", "active"),
          // BW: only this branch's mikrotik servers (admin POP: legacy behaviour shows all)
          scope.isBw
            ? sb.from("mikrotik_devices").select("id, name").eq("branch_id", branchId).eq("enabled", true)
            : sb.from("mikrotik_devices").select("id, name"),
          sb.from("employees").select("id, name").eq("status", "active").eq("branch_id", branchId),
          tariffId
            ? sb.from("reseller_tariff_packages")
                .select("id, package_id, selling_rate, mikrotik_profile, mikrotik_server_id, isp_packages(id, name, bandwidth_down, price)")
                .eq("tariff_id", tariffId)
            : Promise.resolve({ data: [] } as any),
          // BW: fall back to all active ISP packages (no POP-tariff layer)
          scope.isBw
            ? sb.from("isp_packages").select("id, name, bandwidth_down, price").eq("status", "active")
            : Promise.resolve({ data: [] } as any),
        ]);

        const defaultServerId =
          (tariff as any)?.data?.mikrotik_server_id || (pop as any).server_id || null;

        let packages: any[];
        if (scope.isBw) {
          packages = ((allPackages as any).data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            bandwidth_down: p.bandwidth_down,
            price: Number(p.price ?? 0),
            mikrotik_profile: null,
            mikrotik_server_id: null,
          }));
        } else {
          const tpkgRows = ((tpkgs as any).data || []).filter((p: any) => p.isp_packages);
          let popPriceMap = new Map<string, number>();
          if (tpkgRows.length && scope.popId) {
            const { data: pricing } = await sb
              .from("pop_package_pricing")
              .select("tariff_package_id, pop_selling_rate")
              .eq("branch_manager_id", scope.popId)
              .in("tariff_package_id", tpkgRows.map((r: any) => r.id));
            popPriceMap = new Map(
              (pricing || []).map((r: any) => [r.tariff_package_id, Number(r.pop_selling_rate ?? 0)]),
            );
          }
          packages = tpkgRows.map((p: any) => ({
            id: p.isp_packages.id,
            name: p.isp_packages.name,
            bandwidth_down: p.isp_packages.bandwidth_down,
            price: popPriceMap.get(p.id) ?? Number(p.selling_rate ?? 0),
            mikrotik_profile: p.mikrotik_profile || null,
            mikrotik_server_id: p.mikrotik_server_id || null,
          }));
        }

        const popPrefix = (pop as any).pop_prefix || (pop as any).pop_code || (scope.isBw ? "BW" : "0000");
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
        if (!allowPanelOrPop(tok)) return json({ error: "Not allowed" }, 403);
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
        if (!allowPanelOrPop(tok)) return json({ error: "Not allowed" }, 403);
        const scope = await getScope(sb, tok);
        if (scope.isBw && !scope.panelActive) return json({ error: "প্যানেল সাবস্ক্রিপশন এক্সপায়ার্ড" }, 403);
        if (!scope.branchId) return json({ error: "POP branch not found" }, 400);

        const p = payload || {};
        const { mobile: legacyMobile, ...safePayload } = p as any;
        if (!p.name || !p.client_id) return json({ error: "নাম ও ক্লায়েন্ট কোড আবশ্যক" }, 400);

        // ─── BW Panel path: simple insert (no tariff/wallet checks) ───
        if (scope.isBw) {
          const insertRow: any = {
            ...safePayload,
            contact: p.contact ?? legacyMobile ?? null,
            branch_id: scope.branchId,
            owner_scope: "pop",
          };
          const { data: inserted, error } = await sb
            .from("clients")
            .insert(insertRow)
            .select("id")
            .single();
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true, id: inserted?.id });
        }

        // ─── POP admin path (tariff-based, prepaid wallet) ───
        const pop = scope.pop;
        // Enforce: package_id MUST be in this POP's tariff. No silent fallback.
        if (!p.package_id) return json({ error: "Package required" }, 400);
        if (!scope.tariffId) return json({ error: "এই POP-এ tariff assigned নেই" }, 400);

        const { data: tpkg } = await sb
          .from("reseller_tariff_packages")
          .select("selling_rate, validity_days, mikrotik_profile, mikrotik_server_id, package_id, mikrotik_devices:mikrotik_devices!reseller_tariff_packages_mikrotik_server_id_fkey(id, name)")
          .eq("tariff_id", scope.tariffId)
          .eq("package_id", p.package_id)
          .eq("status", "active")
          .maybeSingle();

        if (!tpkg) {
          return json({ error: "PACKAGE_NOT_IN_TARIFF: এই package POP-এর tariff-এ assigned নয়" }, 403);
        }

        const buyPrice = Number(tpkg.selling_rate || 0);
        const validityDays = Number(tpkg.validity_days || 30) || 30;
        const forcedProfile = tpkg.mikrotik_profile || null;
        const forcedMikrotikId = (tpkg as any)?.mikrotik_devices?.id || tpkg.mikrotik_server_id || null;
        const forcedServerName = (tpkg as any)?.mikrotik_devices?.name || null;

        const isActiveBilling = String(p.billing_status || "Active").toLowerCase() === "active";
        const walletBalance = Number((pop as any)?.balance || 0);
        if (isActiveBilling && buyPrice > 0 && walletBalance < buyPrice) {
          return json({
            error: `INSUFFICIENT_BALANCE: প্যাকেজ ৳${buyPrice} — wallet balance ৳${walletBalance.toFixed(2)}। আগে recharge করুন।`,
          }, 400);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(today);
        exp.setDate(exp.getDate() + validityDays);
        const expIso = exp.toISOString().slice(0, 10);

        const { profile: _ignoredProfile, mikrotik_profile: _ignoredMP, mikrotik_id: _ignoredMI, server_name: _ignoredSN, monthly_bill: _ignoredMB, ...stripped } = safePayload;
        const insertRow: any = {
          ...stripped,
          contact: p.contact ?? legacyMobile ?? null,
          branch_id: scope.branchId,
          district_id: (pop as any)?.district_id || null,
          upazila_id: (pop as any)?.upazila_id || null,
          owner_scope: "pop",
          profile: forcedProfile,
          mikrotik_id: forcedMikrotikId,
          server_name: forcedServerName,
          monthly_bill: buyPrice,
          expire_date: isActiveBilling ? expIso : (p.expire_date ?? null),
        };

        const { data: inserted, error } = await sb
          .from("clients")
          .insert(insertRow)
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 500);

        if (isActiveBilling && inserted?.id && buyPrice > 0) {
          const { error: rpcErr } = await sb.rpc("pop_recharge_client_days", {
            p_client_id: inserted.id,
            p_days: validityDays,
          });
          if (rpcErr) {
            await sb.from("clients").delete().eq("id", inserted.id);
            return json({ error: rpcErr.message }, 400);
          }
        }

        if (inserted?.id && isActiveBilling && buyPrice > 0) {
          const joinStr = p.joining_date || new Date().toISOString().slice(0, 10);
          const join = new Date(joinStr + "T00:00:00");
          const y = join.getFullYear();
          const m = join.getMonth() + 1;
          const totalDays = new Date(y, m, 0).getDate();
          const joinDay = join.getDate();
          const daysRemaining = totalDays - joinDay + 1;
          const monthly = buyPrice;
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
            branch_id: scope.branchId,
          });
        }

        return json({ ok: true, id: inserted?.id });
      }

      case "list_pop_clients": {
        if (!isPopScopedToken(tok)) {
          return json({ error: "Not allowed" }, 403);
        }
        const ctx = await resolvePopContext(sb, tok);
        if (ctx.isBwPanel && !ctx.panelActive) {
          return json({ error: "Panel subscription inactive" }, 403);
        }
        const search = String(payload.search || "").trim();
        const minimal = !!payload.minimal;
        let branchId: string | null = ctx.branchId;
        if (!branchId && !ctx.isBwPanel) {
          const { data: pop } = await sb
            .from("branch_managers")
            .select("branch_id")
            .eq("id", ctx.popId)
            .maybeSingle();
          branchId = pop?.branch_id || null;
        }
        if (!branchId) return json({ clients: [] });
        // Reuse below as `pop.branch_id`
        const pop = { branch_id: branchId };

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
        if (!allowPanelOrPop(tok)) return json({ error: "Not allowed" }, 403);
        const scope = await getScope(sb, tok);
        if (scope.isBw && !scope.panelActive) return json({ error: "প্যানেল সাবস্ক্রিপশন এক্সপায়ার্ড" }, 403);
        if (!scope.branchId) return json({ error: "POP branch not found" }, 400);
        const clientId = String(payload.client_id || "");
        if (!clientId) return json({ error: "Client is required" }, 400);
        const pop = { branch_id: scope.branchId };

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
        if (!allowPanelOrPop(tok)) return json({ error: "Not allowed" }, 403);
        const scope = await getScope(sb, tok);
        if (scope.isBw && !scope.panelActive) return json({ clients: [] });
        if (!scope.branchId) return json({ clients: [] });
        const pop = { branch_id: scope.branchId };

        const { data: clients, error } = await sb
          .from("clients")
          .select(`
            id, client_id, name, contact, username, remote_address, status,
            client_type, connection_type, monthly_bill, expire_date, speed,
            server_name, mac_address, protocol_type, profile, password,
            mikrotik_id, mikrotik_status, is_vip, billing_date, is_online,
            zone_id, sub_zone_id, box_id, package_id, email, billing_status,
            auto_recharge_enabled,
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
        // Strip stale/non-existent column keys (legacy text fields no longer in schema)
        delete empRow.department;
        delete empRow.designation;
        // Strip sub-user-only fields before insert
        const hasAccess = !!p.has_user_access;
        const subUsername = p.user_username;
        const subPassword = p.user_password;
        const subPermissions = p.user_permissions || {};
        delete empRow.has_user_access;
        delete empRow.user_username;
        delete empRow.user_password;
        delete empRow.user_permissions;

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
        if (!isPopScopedToken(tok)) {
          return json({ error: "Forbidden" }, 403);
        }
        const popCtx = await resolvePopContext(sb, tok);
        const popId = popCtx.popId;
        if (!popId) return json({ error: "POP not resolved" }, 400);
        if (popCtx.isBwPanel && !popCtx.panelActive) return json({ error: "Forbidden" }, 403);

        // Resolve POP record (branch_id, tariff_id, etc.)
        const { data: pop } = popCtx.isBwPanel
          ? { data: { id: popId, name: popCtx.customer?.customer_name || tok.name || "BW Panel", pop_code: null, branch_id: popCtx.branchId, tariff_id: null } }
          : await sb
              .from("branch_managers")
              .select("id, name, pop_code, branch_id, tariff_id")
              .eq("id", popId)
              .maybeSingle();
        const branchId: string | null = pop?.branch_id || popCtx.branchId || null;
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
        if (!isPopScopedToken(tok)) {
          return json({ error: "Forbidden" }, 403);
        }
        const popCtx = await resolvePopContext(sb, tok);
        const popId = popCtx.popId;
        if (!popId) return json({ error: "POP not resolved" }, 400);
        if (popCtx.isBwPanel && !popCtx.panelActive) return json({ error: "Forbidden" }, 403);
        const mode = String(payload.mode || "district");

        const { data: pop } = popCtx.isBwPanel
          ? { data: { district_id: null, upazila_id: null } }
          : await sb
              .from("branch_managers")
              .select("district_id, upazila_id")
              .eq("id", popId)
              .maybeSingle();

        const { data: assignments } = popCtx.isBwPanel
          ? { data: [] }
          : await sb
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

      // ===== POP Online Client Monitoring =====
      case "pop_monitoring_filters":
      case "pop_monitoring_clients":
      case "pop_monitoring_sync_online":
      case "pop_monitoring_active_sessions":
      case "pop_live_traffic_snapshot":
      case "pop_ping_client":
      case "pop_manage_mikrotik_ppp":
      case "pop_send_sms": {
        if (!isPopScopedToken(tok)) {
          return json({ error: "Forbidden" }, 403);
        }
        const popCtx = await resolvePopContext(sb, tok);
        const popId = popCtx.popId;
        if (!popId) return json({ error: "POP not resolved" }, 400);
        if (popCtx.isBwPanel && !popCtx.panelActive) return json({ error: "Forbidden" }, 403);

        const { data: pop } = popCtx.isBwPanel
          ? { data: { id: popId, name: popCtx.customer?.customer_name || tok.name || "BW Panel", pop_code: null, branch_id: popCtx.branchId, tariff_id: null } }
          : await sb
              .from("branch_managers")
              .select("id, name, pop_code, branch_id, tariff_id")
              .eq("id", popId)
              .maybeSingle();
        const branchId: string | null = pop?.branch_id || popCtx.branchId || null;
        if (!branchId) return json({ error: "POP-এর জন্য branch assign করা নেই" }, 400);

        // Visible MikroTik devices for this POP
        const { data: directDevices } = await sb
          .from("mikrotik_devices")
          .select("id, name, ip_address, status, branch_id, assigned_to_pop_id, enabled, order_no, created_at")
          .order("order_no", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });
        const visibleDevices = (directDevices || []).filter((d: any) =>
          d.enabled !== false &&
          ((branchId && d.branch_id === branchId) || d.assigned_to_pop_id === popId)
        );
        const visibleIds = new Set<string>(visibleDevices.map((d: any) => d.id));

        const { data: transferRows } = await sb
          .from("mikrotik_clients")
          .select("transferred_to_mikrotik_id")
          .eq("transferred_to_pop_id", popId)
          .not("transferred_to_mikrotik_id", "is", null);
        const transferredIds = new Set<string>(
          (transferRows || []).map((r: any) => r.transferred_to_mikrotik_id).filter(Boolean)
        );
        const missingIds = [...transferredIds].filter((id) => !visibleIds.has(id));
        if (missingIds.length > 0) {
          const { data: extra } = await sb
            .from("mikrotik_devices")
            .select("id, name, ip_address, status, branch_id, assigned_to_pop_id, enabled, order_no, created_at")
            .in("id", missingIds);
          (extra || []).filter((d: any) => d.enabled !== false).forEach((d: any) => {
            visibleDevices.push(d);
            visibleIds.add(d.id);
          });
        }

        const assertDeviceVisible = (mtId: string | undefined | null): boolean =>
          !!mtId && visibleIds.has(mtId);
        const assertClientInBranch = async (clientId: string | undefined | null): Promise<boolean> => {
          if (!clientId) return false;
          const { data } = await sb
            .from("clients")
            .select("id")
            .eq("id", clientId)
            .eq("branch_id", branchId)
            .maybeSingle();
          return !!data;
        };

        if (action === "pop_monitoring_filters") {
          const [zonesRes, connRes] = await Promise.all([
            sb.from("zones").select("id, name").eq("status", "active").eq("branch_id", branchId).order("name"),
            sb.from("connection_types_config").select("id, name").eq("status", "active").order("name"),
          ]);
          return json({
            servers: visibleDevices.map((d: any) => ({ id: d.id, name: d.name, order_no: d.order_no ?? null })),
            zones: zonesRes.data || [],
            connection_types: connRes.data || [],
          });
        }

        if (action === "pop_monitoring_clients") {
          const mtId: string | undefined = payload.mikrotik_id;
          if (!mtId) return json({ clients: [] });
          if (!assertDeviceVisible(mtId)) return json({ error: "MikroTik not visible to this POP" }, 403);

          const { data } = await sb
            .from("clients")
            .select(
              "id, client_id, name, contact, username, remote_address, connection_type, profile, status, mikrotik_id, server_name, total_upload, total_download, mac_address, is_online, mikrotik_status, zone_id, sub_zone_id, box_id"
            )
            .eq("branch_id", branchId)
            .eq("mikrotik_id", mtId)
            .eq("mikrotik_status", "enabled")
            .neq("status", "left");

          const rows = (data || []) as any[];
          const zoneIds = [...new Set(rows.map((r) => r.zone_id).filter(Boolean))];
          const subZoneIds = [...new Set(rows.map((r) => r.sub_zone_id).filter(Boolean))];
          const boxIds = [...new Set(rows.map((r) => r.box_id).filter(Boolean))];
          const [zonesRes, subZonesRes, boxesRes, devRes] = await Promise.all([
            zoneIds.length ? sb.from("zones").select("id, name").in("id", zoneIds) : Promise.resolve({ data: [] } as any),
            subZoneIds.length ? sb.from("sub_zones").select("id, name").in("id", subZoneIds) : Promise.resolve({ data: [] } as any),
            boxIds.length ? sb.from("boxes").select("id, name").in("id", boxIds) : Promise.resolve({ data: [] } as any),
            sb.from("mikrotik_devices").select("id, name").eq("id", mtId).maybeSingle(),
          ]);
          const zMap = new Map((zonesRes.data || []).map((z: any) => [z.id, z]));
          const szMap = new Map((subZonesRes.data || []).map((z: any) => [z.id, z]));
          const bxMap = new Map((boxesRes.data || []).map((z: any) => [z.id, z]));
          const enriched = rows.map((c) => ({
            ...c,
            zone: c.zone_id ? zMap.get(c.zone_id) || null : null,
            sub_zone: c.sub_zone_id ? szMap.get(c.sub_zone_id) || null : null,
            box: c.box_id ? bxMap.get(c.box_id) || null : null,
            mikrotik_device: devRes.data || null,
          }));
          return json({ clients: enriched });
        }

        if (action === "pop_monitoring_active_sessions") {
          const mtId: string | undefined = payload.mikrotik_id;
          if (!mtId) return json({ error: "mikrotik_id required" }, 400);
          if (!assertDeviceVisible(mtId)) return json({ error: "MikroTik not visible to this POP" }, 403);

          const url = `${SUPABASE_URL}/functions/v1/fetch-mikrotik-ppp`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ action: "active-sessions", device_id: mtId }),
          });
          const data = await r.json();
          if (!r.ok) return json({ error: data?.error || "MikroTik fetch failed" }, r.status);

          const { data: branchClients } = await sb
            .from("clients")
            .select("username")
            .eq("branch_id", branchId)
            .eq("mikrotik_id", mtId);
          const allowedNames = new Set(
            (branchClients || []).map((c: any) => (c.username || "").toLowerCase()).filter(Boolean)
          );
          const filterByName = (arr: any[]) =>
            (arr || []).filter((x: any) => allowedNames.has(String(x.username || x.name || "").toLowerCase()));

          const sessions = (data?.sessions || []).filter((s: any) =>
            allowedNames.has(String(s.name || "").toLowerCase())
          );
          const mismatch = data?.mismatch
            ? {
                disabledInSystem: filterByName(data.mismatch.disabledInSystem || []),
                enabledInSystem: filterByName(data.mismatch.enabledInSystem || []),
                profileMismatch: filterByName(data.mismatch.profileMismatch || []),
              }
            : { disabledInSystem: [], enabledInSystem: [], profileMismatch: [] };
          return json({ sessions, mismatch });
        }

        if (action === "pop_monitoring_sync_online") {
          const url = `${SUPABASE_URL}/functions/v1/fetch-mikrotik-ppp`;
          let online = 0;
          let offline = 0;
          for (const d of visibleDevices) {
            try {
              const r = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({ action: "sync-online", device_id: (d as any).id }),
              });
              const dd = await r.json();
              if (r.ok) {
                online += Number(dd?.online || 0);
                offline += Number(dd?.offline || 0);
              }
            } catch (_) { /* ignore */ }
          }
          return json({ ok: true, online, offline });
        }

        if (action === "pop_live_traffic_snapshot") {
          const clientId: string | undefined = payload.client_id;
          if (!clientId) return json({ error: "client_id required" }, 400);
          if (!(await assertClientInBranch(clientId))) {
            return json({ error: "Client not in this POP" }, 403);
          }
          const url = `${SUPABASE_URL}/functions/v1/live-traffic-snapshot`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ client_id: clientId }),
          });
          const data = await r.json();
          return json(data, r.ok ? 200 : r.status);
        }

        if (action === "pop_ping_client" || action === "pop_manage_mikrotik_ppp") {
          const mtId: string | undefined = payload.mikrotik_id;
          if (!assertDeviceVisible(mtId)) return json({ error: "MikroTik not visible to this POP" }, 403);
          if (payload.client_id && !(await assertClientInBranch(payload.client_id))) {
            return json({ error: "Client not in this POP" }, 403);
          }
          // Block manual enable when client's expire_date is strictly past — recharge first
          if (action === "pop_manage_mikrotik_ppp" && payload.action === "enable" && payload.client_id) {
            const { data: cRow } = await sb
              .from("clients")
              .select("expire_date")
              .eq("id", payload.client_id)
              .maybeSingle();
            const exp = (cRow as any)?.expire_date as string | null;
            const todayStr = new Date().toISOString().slice(0, 10);
            if (exp && exp < todayStr) {
              return json({ error: "EXPIRED: Client expired — আগে recharge করুন, তারপর enable করা যাবে" }, 400);
            }
          }
          const url = `${SUPABASE_URL}/functions/v1/manage-mikrotik-ppp`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await r.json();
          return json(data, r.ok ? 200 : r.status);
        }

        if (action === "pop_send_sms") {
          const message: string = String(payload.message || "").trim();
          if (!message) return json({ error: "Message required" }, 400);
          const recipients: string[] = Array.isArray(payload.recipients)
            ? payload.recipients.map((x: any) => String(x || "").trim()).filter(Boolean)
            : [];
          if (recipients.length === 0) return json({ error: "No recipients" }, 400);

          const { data: contacts } = await sb
            .from("clients")
            .select("contact")
            .eq("branch_id", branchId)
            .in("contact", recipients);
          const allowed = new Set((contacts || []).map((c: any) => c.contact));
          const cleanRecipients = recipients.filter((r) => allowed.has(r));
          if (cleanRecipients.length === 0) {
            return json({ error: "No valid POP-scoped recipients" }, 400);
          }

          const { error: logErr } = await sb.from("sms_log").insert({
            recipient: cleanRecipients.join(","),
            message,
            sms_type: cleanRecipients.length > 1 ? "online_bulk" : "individual",
            status: "sent",
            sent_at: new Date().toISOString(),
            recipient_count: cleanRecipients.length,
          });
          if (logErr) return json({ error: logErr.message }, 500);
          return json({ ok: true, sent: cleanRecipients.length });
        }

        return json({ error: "Unknown POP monitoring action" }, 400);
      }

      case "pop_ticket_clients": {
        // BW customers don't have downstream clients — return self as the only "client"
        if (tok.type === "bw_customer") {
          return json({
            clients: [{
              id: tok.sub,
              name: (tok as any).name || "Self",
              client_id: (tok as any).code || "",
              username: (tok as any).username || "",
              contact: (tok as any).mobile || "",
              mobile: (tok as any).mobile || "",
            }],
          });
        }
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
        const { data, error } = await sb
          .from("clients")
          .select("id, name, client_id, username, contact, mobile")
          .eq("branch_id", pop.branch_id)
          .neq("status", "left")
          .order("name");
        if (error) return json({ error: error.message }, 500);
        return json({ clients: data || [] });
      }

      case "pop_ticket_categories": {
        if (
          tok.type !== "reseller" &&
          tok.type !== "reseller_sub" &&
          tok.type !== "bw_customer"
        ) {
          return json({ error: "Not allowed" }, 403);
        }
        const { data, error } = await sb
          .from("support_categories")
          .select("id, name, status")
          .eq("status", "active")
          .order("name");
        if (error) return json({ error: error.message }, 500);
        return json({ categories: data || [] });
      }

      case "pop_create_ticket": {
        const isBw = tok.type === "bw_customer";
        if (!isBw && tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Not allowed" }, 403);
        }
        const subject = String(payload.subject || "").trim();
        const description = String(payload.description || "");
        const priority = String(payload.priority || "normal");
        const categoryId = payload.category_id || null;
        if (!subject) return json({ error: "subject required" }, 400);

        let clientId: string;
        let zoneId: string | null = null;

        if (isBw) {
          // BW customer files a ticket against themselves
          clientId = tok.sub;
        } else {
          const resellerId =
            tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
          clientId = String(payload.client_id || "");
          if (!clientId) return json({ error: "client_id required" }, 400);

          const { data: pop } = await sb
            .from("branch_managers")
            .select("branch_id")
            .eq("id", resellerId)
            .maybeSingle();
          if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

          const { data: client } = await sb
            .from("clients")
            .select("id, branch_id, zone_id")
            .eq("id", clientId)
            .maybeSingle();
          if (!client || client.branch_id !== pop.branch_id) {
            return json({ error: "Client not in your POP" }, 403);
          }
          zoneId = client.zone_id || null;
        }

        const ticket_no = `TK${Date.now().toString().slice(-8)}`;
        const { data: ticket, error: tErr } = await sb
          .from("support_tickets")
          .insert({
            ticket_no,
            subject,
            description,
            priority,
            category_id: categoryId,
            client_id: clientId,
            zone_id: zoneId,
            status: "open",
            source: isBw ? "bw_customer" : "pop_admin",
            created_by: null,
          })
          .select()
          .single();
        if (tErr) return json({ error: tErr.message }, 500);

        if (ticket) {
          await sb.from("support_ticket_messages").insert({
            ticket_id: ticket.id,
            sender_type: isBw ? "client" : "agent",
            sender_id: null,
            sender_name: tok.name || (isBw ? "BW Customer" : "POP Admin"),
            message: description || subject,
          });
        }
        return json({ ok: true, ticket });
      }

      // ===== SMS Templates: master + per-branch override (POP scope) =====
      case "pop_list_templates": {
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
        const branchId = pop?.branch_id || null;

        const { data: masters, error: mErr } = await sb
          .from("sms_template_master")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true });
        if (mErr) return json({ error: mErr.message }, 500);

        let overrides: any[] = [];
        if (branchId) {
          const { data: ovs, error: oErr } = await sb
            .from("sms_template_overrides")
            .select("*")
            .eq("branch_id", branchId);
          if (oErr) return json({ error: oErr.message }, 500);
          overrides = ovs || [];
        }
        const ovByMaster = new Map(overrides.map((o) => [o.master_id, o]));
        const merged = (masters || [])
          // Hide other POPs' custom templates; keep system-level (created_by_branch NULL) and own
          .filter((m: any) => !m.created_by_branch || m.created_by_branch === branchId)
          .map((m: any) => {
            const o = ovByMaster.get(m.id);
            return {
              master_id: m.id,
              template_key: m.template_key,
              name: o?.name ?? m.name,
              content: o?.content ?? m.content,
              template_type: m.template_type,
              category: m.category,
              variables: m.variables,
              is_protected: m.is_protected,
              is_active: o?.is_active ?? m.is_active,
              branch_id: branchId,
              is_overridden: !!o,
              override_id: o?.id || null,
              created_by_branch: m.created_by_branch || null,
              is_own: m.created_by_branch === branchId,
            };
          });
        return json({ templates: merged });
      }

      case "pop_create_template": {
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
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const name = String(payload.name || "").trim();
        const content = String(payload.content || "").trim();
        const category = String(payload.category || "general");
        const is_active = typeof payload.is_active === "boolean" ? payload.is_active : true;
        if (!name || !content) return json({ error: "name এবং content আবশ্যক" }, 400);

        const variables = Array.from(
          new Set(Array.from(content.matchAll(/\{(\w+)\}/g)).map((m) => m[1])),
        );
        const shortBranch = String(pop.branch_id).replace(/-/g, "").slice(0, 8);
        const template_key = `pop_${shortBranch}_${Date.now()}`;

        const { data, error } = await sb
          .from("sms_template_master")
          .insert({
            template_key,
            name,
            content,
            category,
            variables,
            is_active,
            is_protected: false,
            template_type: "custom",
            created_by_branch: pop.branch_id,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, template: data });
      }

      case "pop_update_own_template": {
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
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const masterId = String(payload.master_id || "");
        if (!masterId) return json({ error: "master_id required" }, 400);

        const { data: master } = await sb
          .from("sms_template_master")
          .select("id, created_by_branch, is_protected")
          .eq("id", masterId)
          .maybeSingle();
        if (!master) return json({ error: "Template not found" }, 404);
        if (master.is_protected || master.created_by_branch !== pop.branch_id) {
          return json({ error: "শুধু নিজের তৈরি টেমপ্লেট edit করা যাবে" }, 403);
        }

        const updates: any = {};
        if (payload.name != null) updates.name = String(payload.name);
        if (payload.content != null) {
          updates.content = String(payload.content);
          updates.variables = Array.from(
            new Set(Array.from(String(payload.content).matchAll(/\{(\w+)\}/g)).map((m) => m[1])),
          );
        }
        if (payload.category != null) updates.category = String(payload.category);
        if (typeof payload.is_active === "boolean") updates.is_active = payload.is_active;

        const { error } = await sb
          .from("sms_template_master")
          .update(updates)
          .eq("id", masterId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "pop_delete_template": {
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
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const masterId = String(payload.master_id || "");
        if (!masterId) return json({ error: "master_id required" }, 400);

        const { data: master } = await sb
          .from("sms_template_master")
          .select("id, created_by_branch, is_protected")
          .eq("id", masterId)
          .maybeSingle();
        if (!master) return json({ error: "Template not found" }, 404);
        if (master.is_protected) {
          return json({ error: "প্রটেক্টেড টেমপ্লেট ডিলিট করা যাবে না" }, 403);
        }
        if (master.created_by_branch !== pop.branch_id) {
          return json({ error: "শুধু নিজের তৈরি টেমপ্লেট ডিলিট করা যাবে" }, 403);
        }

        const { error } = await sb
          .from("sms_template_master")
          .delete()
          .eq("id", masterId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "pop_save_template_override": {
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
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const masterId = String(payload.master_id || "");
        if (!masterId) return json({ error: "master_id required" }, 400);

        const { data: master } = await sb
          .from("sms_template_master")
          .select("id")
          .eq("id", masterId)
          .maybeSingle();
        if (!master) return json({ error: "Master template not found" }, 404);

        const row = {
          master_id: masterId,
          branch_id: pop.branch_id,
          name: payload.name ?? null,
          content: payload.content ?? null,
          is_active: typeof payload.is_active === "boolean" ? payload.is_active : null,
        };

        // Check existing override for this branch
        const { data: existing } = await sb
          .from("sms_template_overrides")
          .select("id")
          .eq("master_id", masterId)
          .eq("branch_id", pop.branch_id)
          .maybeSingle();

        if (existing) {
          const { error } = await sb
            .from("sms_template_overrides")
            .update(row)
            .eq("id", existing.id);
          if (error) return json({ error: error.message }, 500);
        } else {
          const { error } = await sb.from("sms_template_overrides").insert(row);
          if (error) return json({ error: error.message }, 500);
        }
        return json({ ok: true });
      }

      case "pop_reset_template": {
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
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const masterId = String(payload.master_id || "");
        if (!masterId) return json({ error: "master_id required" }, 400);

        const { error } = await sb
          .from("sms_template_overrides")
          .delete()
          .eq("master_id", masterId)
          .eq("branch_id", pop.branch_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "pop_dashboard_overview": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") {
          return json({ error: "Not allowed" }, 403);
        }
        const resellerId =
          tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data: pop } = await sb
          .from("branch_managers")
          .select("id, branch_id, balance")
          .eq("id", resellerId)
          .maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch not found" }, 400);

        const branchId = pop.branch_id;
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthIso = monthStart.toISOString();
        const last180 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();

        const [
          allClientsQ, billingQ, collectionsQ, zonesQ, newClientsQ,
          ticketsQ, noticesQ, expensesQ
        ] = await Promise.all([
          sb.from("clients").select("id, status, billing_status, monthly_bill, zone_id, name")
            .eq("branch_id", branchId),
          sb.from("billing").select("amount, paid, due, discount, created_at, client_id")
            .eq("branch_id", branchId).gte("created_at", monthIso),
          sb.from("bill_collections").select("amount, created_at, client_id, payment_method")
            .gte("created_at", monthIso),
          sb.from("zones").select("id, name").eq("status", "active"),
          sb.from("clients").select("created_at, status").eq("branch_id", branchId)
            .gte("created_at", last180),
          sb.from("support_tickets").select("id, ticket_no, subject, status, created_at")
            .order("created_at", { ascending: false }).limit(5),
          sb.from("client_notices").select("id, title, body, created_at")
            .eq("active", true).order("created_at", { ascending: false }).limit(5),
          sb.from("expense_entries").select("amount, expense_date, payment_method")
            .eq("branch_id", branchId).gte("expense_date", monthStart.toISOString().slice(0, 10)),
        ]);

        const clients = allClientsQ.data || [];
        const billing = billingQ.data || [];
        const collections = collectionsQ.data || [];
        const newClients = newClientsQ.data || [];
        const expenses = expensesQ.data || [];

        const totalClients = clients.length;
        const activeClients = clients.filter((c: any) => c.status === "Active").length;
        const onlineClients = clients.filter((c: any) => c.billing_status === "online").length;
        const monthlyBillSum = clients.reduce((s: number, c: any) => s + Number(c.monthly_bill || 0), 0);

        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const remainingDays = daysInMonth - today.getDate() + 1;
        const dailyCharged = monthlyBillSum / daysInMonth;
        const approxRechargeable = dailyCharged * remainingDays;

        const billed = billing.reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
        const collectionsTotal = collections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
        const billingPaid = billing.reduce((s: number, b: any) => s + Number(b.paid || 0), 0);
        const collected = billingPaid + collectionsTotal;
        const totalDue = billing.reduce((s: number, b: any) => s + Number(b.due || 0), 0);
        const totalDiscount = billing.reduce((s: number, b: any) => s + Number(b.discount || 0), 0);
        const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

        const newThisMonth = newClients
          .filter((c: any) => new Date(c.created_at) >= monthStart).length;

        const monthly: { month: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          d.setDate(1);
          const next = new Date(d); next.setMonth(next.getMonth() + 1);
          const count = newClients.filter((c: any) => {
            const cd = new Date(c.created_at);
            return cd >= d && cd < next;
          }).length;
          monthly.push({ month: d.toLocaleString("en-US", { month: "short" }), count });
        }

        const zoneMap: Record<string, { name: string; count: number }> = {};
        (zonesQ.data || []).forEach((z: any) => (zoneMap[z.id] = { name: z.name, count: 0 }));
        clients.forEach((c: any) => {
          if (c.zone_id && zoneMap[c.zone_id]) zoneMap[c.zone_id].count++;
        });
        const zoneChart = Object.values(zoneMap).filter((z) => z.count > 0).slice(0, 6);

        const unpaidByClient: Record<string, { name: string; due: number }> = {};
        billing.forEach((b: any) => {
          const due = Number(b.due || 0);
          if (due <= 0) return;
          const c = clients.find((x: any) => x.id === b.client_id);
          if (!c) return;
          if (!unpaidByClient[b.client_id]) unpaidByClient[b.client_id] = { name: c.name, due: 0 };
          unpaidByClient[b.client_id].due += due;
        });
        const topUnpaid = Object.values(unpaidByClient).sort((a, b) => b.due - a.due).slice(0, 10);

        // cash on hand = collected (cash method) - cash expenses
        const cashCollected = collections
          .filter((c: any) => !c.payment_method || c.payment_method === "cash")
          .reduce((s: number, c: any) => s + Number(c.amount || 0), 0) + billingPaid;
        const cashExpenses = expenses
          .filter((e: any) => !e.payment_method || e.payment_method === "cash")
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const cashOnHand = cashCollected - cashExpenses;

        return json({
          balance: Number(pop.balance || 0),
          totalClients,
          activeClients,
          onlineClients,
          monthlyBillSum,
          dailyCharged,
          approxRechargeable,
          billed,
          collected,
          totalDue,
          totalDiscount,
          expenseTotal,
          newThisMonth,
          monthly,
          zoneChart,
          topUnpaid,
          cashOnHand,
          tickets: ticketsQ.data || [],
          notices: noticesQ.data || [],
        });
      }

      case "pop_get_debit_history": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const from = String(payload.from || "1970-01-01");
        const to = String(payload.to || new Date().toISOString().slice(0, 10));
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ rows: [] });
        const { data, error } = await sb
          .from("branch_funding")
          .select("*")
          .eq("branch_id", pop.branch_id)
          .gte("funding_date", from)
          .lte("funding_date", to)
          .order("funding_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(2000);
        if (error) return json({ error: error.message }, 400);
        return json({ rows: data || [] });
      }

      case "pop_get_credit_history": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const popId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const from = String(payload.from || "1970-01-01");
        const to = String(payload.to || new Date().toISOString().slice(0, 10));
        const { data, error } = await sb
          .from("pop_daily_charges")
          .select("charge_date, package_name, profile, protocol_type, server_name, charged_amount, client_id")
          .eq("pop_id", popId)
          .gte("charge_date", from)
          .lte("charge_date", to)
          .order("charge_date", { ascending: false })
          .limit(10000);
        if (error) return json({ error: error.message }, 400);
        return json({ rows: data || [] });
      }

      case "pop_get_credit_detail": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const popId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const date = String(payload.date || "");
        if (!date) return json({ rows: [] });
        const { data, error } = await sb
          .from("pop_daily_charges")
          .select("*")
          .eq("pop_id", popId)
          .eq("charge_date", date)
          .order("client_username", { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ rows: data || [] });
      }

      case "get_clients_recharge_cost": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const ids: string[] = Array.isArray(payload.client_ids) ? payload.client_ids : [];
        if (!ids.length) return json({ items: [] });
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch missing" }, 400);
        const { data: owned } = await sb.from("clients").select("id, package_id").eq("branch_id", pop.branch_id).in("id", ids);
        const pkgIds = Array.from(new Set((owned || []).map((r: any) => r.package_id).filter(Boolean)));
        const pkgMap = new Map<string, string>();
        if (pkgIds.length) {
          const { data: pkgs } = await sb.from("isp_packages").select("id, name").in("id", pkgIds);
          for (const p of (pkgs || [])) pkgMap.set((p as any).id, (p as any).name);
        }
        const items: any[] = [];
        for (const row of (owned || [])) {
          const { data: cost, error: cErr } = await sb.rpc("pop_resolve_client_package_cost", { p_client_id: (row as any).id });
          if (cErr) { items.push({ client_id: (row as any).id, error: cErr.message }); continue; }
          const r = Array.isArray(cost) ? cost[0] : cost;
          const buy = Number(r?.buy_price || 0);
          const validity = Number(r?.validity_days || 30) || 30;
          const minDays = Number(r?.min_activation_days || 1) || 1;
          const daily = validity > 0 ? Math.round((buy / validity) * 100) / 100 : 0;
          const pkgId = (row as any).package_id || null;
          items.push({
            client_id: (row as any).id,
            package_id: pkgId,
            package_name: pkgId ? (pkgMap.get(pkgId) || "Unknown") : "No Package",
            buy_rate: buy,
            validity_days: validity,
            min_activation_days: minDays,
            daily_rate: daily,
          });
        }
        return json({ items });
      }

      case "pop_recharge_client": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const clientId = String(payload.client_id || "");
        const days = parseInt(String(payload.days || 0));
        if (!clientId || !days) return json({ error: "client_id ও days দরকার" }, 400);

        // Verify the client belongs to this POP's branch
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch missing" }, 400);
        const { data: client } = await sb.from("clients").select("id, mikrotik_id, username, mikrotik_status").eq("id", clientId).eq("branch_id", pop.branch_id).maybeSingle();
        if (!client) return json({ error: "Client not in this POP" }, 404);

        const { data, error } = await sb.rpc("pop_recharge_client_days", { p_client_id: clientId, p_days: days });
        if (error) return json({ error: error.message }, 400);

        // Auto-enable MikroTik secret after successful recharge (only if disabled)
        if (client.mikrotik_id && client.username && client.mikrotik_status !== "enabled") {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/manage-mikrotik-ppp`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
              body: JSON.stringify({ mikrotik_id: client.mikrotik_id, username: client.username, client_id: clientId, action: "enable" }),
            });
          } catch (_) { /* non-fatal */ }
        }
        return json(data);
      }

      case "pop_bulk_recharge_clients": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const ids: string[] = Array.isArray(payload.client_ids) ? payload.client_ids : [];
        const days = parseInt(String(payload.days || 0));
        if (!ids.length || !days) return json({ error: "client_ids ও days দরকার" }, 400);

        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch missing" }, 400);
        // Filter to only this POP's clients
        const { data: owned } = await sb.from("clients").select("id, mikrotik_id, username, mikrotik_status").eq("branch_id", pop.branch_id).in("id", ids);
        const allowedRows = owned || [];
        const allowedIds = allowedRows.map((c: any) => c.id);
        if (!allowedIds.length) return json({ error: "কোনো valid client পাওয়া যায়নি" }, 400);

        const { data, error } = await sb.rpc("pop_bulk_recharge_clients", { p_client_ids: allowedIds, p_days: days });
        if (error) return json({ error: error.message }, 400);

        // Auto-enable MikroTik for clients that were recharged successfully (best-effort)
        const failedIds = new Set<string>(
          Array.isArray((data as any)?.errors)
            ? (data as any).errors.flatMap((e: any) => Array.isArray(e) ? e.map((x: any) => x.client_id) : [e.client_id]).filter(Boolean)
            : []
        );
        await Promise.all(
          allowedRows
            .filter((c: any) => !failedIds.has(c.id) && c.mikrotik_id && c.username && c.mikrotik_status !== "enabled")
            .map((c: any) =>
              fetch(`${SUPABASE_URL}/functions/v1/manage-mikrotik-ppp`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
                body: JSON.stringify({ mikrotik_id: c.mikrotik_id, username: c.username, client_id: c.id, action: "enable" }),
              }).catch(() => null),
            ),
        );
        return json(data);
      }

      case "get_pop_balance_info": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const { data } = await sb
          .from("branch_managers")
          .select("id, name, balance, allow_negative_balance, fund_started, auto_recharge_enabled")
          .eq("id", resellerId)
          .maybeSingle();
        return json({ pop: data });
      }

      case "set_pop_auto_recharge": {
        if (tok.type !== "reseller") return json({ error: "Only main reseller can change this" }, 403);
        const enabled = !!payload.enabled;
        const { error } = await sb.from("branch_managers").update({ auto_recharge_enabled: enabled }).eq("id", tok.sub);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, enabled });
      }

      case "set_client_auto_recharge": {
        if (tok.type !== "reseller" && tok.type !== "reseller_sub") return json({ error: "Not allowed" }, 403);
        const resellerId = tok.type === "reseller_sub" ? (tok as any).parent_reseller_id : tok.sub;
        const ids: string[] = Array.isArray(payload.client_ids) ? payload.client_ids : (payload.client_id ? [payload.client_id] : []);
        const enabled = !!payload.enabled;
        if (!ids.length) return json({ error: "client_ids দরকার" }, 400);
        const { data: pop } = await sb.from("branch_managers").select("branch_id").eq("id", resellerId).maybeSingle();
        if (!pop?.branch_id) return json({ error: "POP branch missing" }, 400);
        const { data: owned } = await sb.from("clients").select("id").eq("branch_id", pop.branch_id).in("id", ids);
        const allowed = (owned || []).map((c: any) => c.id);
        if (!allowed.length) return json({ error: "কোনো valid client পাওয়া যায়নি" }, 400);
        const { error } = await sb.from("clients").update({ auto_recharge_enabled: enabled }).in("id", allowed);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, updated: allowed.length, enabled });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("portal-data error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
