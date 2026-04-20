import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { username, password, action, session_id } = body || {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Logout action
    if (action === "logout" && session_id) {
      await supabase
        .from("portal_login_log")
        .update({ logout_at: new Date().toISOString(), status: "ended" })
        .eq("session_id", session_id)
        .eq("status", "active");
      return json({ ok: true });
    }

    if (!username || !password) {
      return json({ error: "Username and password are required" }, 400);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    const issueToken = (payload: Record<string, unknown>) => {
      const sid = crypto.randomUUID();
      const tokenPayload = {
        ...payload,
        session_id: sid,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      return { token: btoa(JSON.stringify(tokenPayload)), customer: tokenPayload, sid };
    };

    // 1. CLIENT
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, client_id, username, password, billing_status, contact, email, address, branch_id, zone_id, sub_zone_id, package_id, monthly_bill")
      .or(`username.eq.${username},client_id.eq.${username}`)
      .limit(1);

    const client = clients?.[0];
    if (client) {
      if (client.password !== password) return json({ error: "Invalid username or password" }, 401);
      const { token, customer, sid } = issueToken({
        sub: client.id,
        name: client.name,
        code: client.client_id,
        username: client.username || client.client_id,
        type: "client",
        email: client.email,
        mobile: client.contact,
        address: client.address,
        branch_id: client.branch_id,
        zone_id: client.zone_id,
        package_id: client.package_id,
        monthly_bill: client.monthly_bill,
      });
      await supabase.from("portal_login_log").insert({
        client_id: client.id,
        username: client.username || client.client_id,
        user_type: "client",
        ip_address: ip,
        user_agent: ua,
        session_id: sid,
        status: "active",
      });
      return json({ token, customer });
    }

    // 2. RESELLER
    const { data: resellers } = await supabase
      .from("branch_managers")
      .select("id, name, username, password, client_code, contact, email, branch_id, balance, tariff_id, status, portal_enabled, district_id, upazila_id")
      .or(`username.eq.${username},client_code.eq.${username},contact.eq.${username},email.eq.${username}`)
      .limit(1);

    const reseller = resellers?.[0];
    if (reseller) {
      if (reseller.password !== password) return json({ error: "Invalid username or password" }, 401);
      if (reseller.portal_enabled === false) return json({ error: "Portal access disabled. Contact admin." }, 403);
      if (reseller.status && reseller.status !== "Active") {
        return json({ error: "Account is inactive. Please contact support." }, 403);
      }
      const { token, customer, sid } = issueToken({
        sub: reseller.id,
        name: reseller.name,
        code: reseller.client_code,
        username: reseller.username,
        type: "reseller",
        email: reseller.email,
        mobile: reseller.contact,
        branch_id: reseller.branch_id,
        balance: reseller.balance,
        tariff_id: reseller.tariff_id,
        district_id: (reseller as any).district_id,
        upazila_id: (reseller as any).upazila_id,
        permissions: { dashboard: true, invoices: true, purchases: true, tickets: true, users: true, settings: true },
      });
      await supabase.from("portal_login_log").insert({
        username: reseller.username || reseller.client_code,
        user_type: "reseller",
        ip_address: ip,
        user_agent: ua,
        session_id: sid,
        status: "active",
      });
      return json({ token, customer });
    }

    // 2b. RESELLER SUB-USER
    const { data: subUser } = await supabase
      .from("bw_reseller_users")
      .select("id, reseller_id, name, username, password, email, mobile, status, permissions, branch_managers!inner(id, name, client_code, balance, tariff_id, branch_id, district_id, upazila_id)")
      .eq("username", username)
      .maybeSingle();

    if (subUser) {
      if (subUser.password !== password) return json({ error: "Invalid username or password" }, 401);
      if (subUser.status !== "active") return json({ error: "Sub-user is inactive" }, 403);
      const parent: any = subUser.branch_managers;
      const { token, customer, sid } = issueToken({
        sub: subUser.id,
        parent_reseller_id: subUser.reseller_id,
        name: subUser.name,
        code: parent?.client_code || "",
        username: subUser.username,
        type: "reseller_sub",
        email: subUser.email,
        mobile: subUser.mobile,
        branch_id: parent?.branch_id,
        balance: parent?.balance,
        tariff_id: parent?.tariff_id,
        district_id: parent?.district_id,
        upazila_id: parent?.upazila_id,
        permissions: subUser.permissions,
      });
      await supabase.from("portal_login_log").insert({
        username: subUser.username,
        user_type: "reseller_sub",
        ip_address: ip,
        user_agent: ua,
        session_id: sid,
        status: "active",
      });
      return json({ token, customer });
    }

    // 3. BW SALE CUSTOMER
    const { data: bwCustomer } = await supabase
      .from("bw_sale_customers")
      .select("id, customer_name, customer_code, username, password, activity_status, pop_id, email, mobile, contact_person, address")
      .eq("username", username)
      .maybeSingle();

    if (bwCustomer) {
      if (bwCustomer.password !== password) return json({ error: "Invalid username or password" }, 401);
      if ((bwCustomer.activity_status || "").toLowerCase() !== "active") {
        return json({ error: "Account is inactive. Please contact support." }, 403);
      }
      const { token, customer, sid } = issueToken({
        sub: bwCustomer.id,
        name: bwCustomer.customer_name,
        code: bwCustomer.customer_code,
        username: bwCustomer.username,
        type: "bw_customer",
        pop_id: bwCustomer.pop_id,
        email: bwCustomer.email,
        mobile: bwCustomer.mobile,
        contact_person: bwCustomer.contact_person,
        address: bwCustomer.address,
      });
      await supabase.from("portal_login_log").insert({
        username: bwCustomer.username,
        user_type: "bw_customer",
        ip_address: ip,
        user_agent: ua,
        session_id: sid,
        status: "active",
      });
      return json({ token, customer });
    }

    return json({ error: "Invalid username or password" }, 401);
  } catch (err) {
    console.error("portal-auth error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
