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

type UserType = "client" | "reseller" | "reseller_sub" | "bw_customer";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    const adminId = userData.user.id;
    const adminEmail = userData.user.email || "unknown";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin role check
    const { data: isAdmin } = await supabase.rpc("is_admin_or_super", { _user_id: adminId });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json();
    const { user_type, user_id } = body as { user_type: UserType; user_id: string };
    if (!user_type || !user_id) return json({ error: "user_type and user_id required" }, 400);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = `[IMPERSONATED by ${adminEmail}] ` + (req.headers.get("user-agent") || "unknown");

    const issueToken = (payload: Record<string, unknown>) => {
      const sid = crypto.randomUUID();
      const tokenPayload = {
        ...payload,
        session_id: sid,
        impersonated_by: adminId,
        impersonated_by_email: adminEmail,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      return { token: btoa(JSON.stringify(tokenPayload)), customer: tokenPayload, sid };
    };

    if (user_type === "client") {
      const { data: client } = await supabase
        .from("clients")
        .select("id, name, client_id, username, billing_status, contact, email, address, branch_id, zone_id, sub_zone_id, package_id, monthly_bill")
        .eq("id", user_id)
        .maybeSingle();
      if (!client) return json({ error: "Client not found" }, 404);
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
        ip_address: ip, user_agent: ua, session_id: sid, status: "active",
      });
      return json({ token, customer, redirect: "/portal/dashboard" });
    }

    if (user_type === "reseller") {
      const { data: reseller } = await supabase
        .from("branch_managers")
        .select("id, name, username, client_code, contact, email, branch_id, balance, tariff_id, district_id, upazila_id")
        .eq("id", user_id)
        .maybeSingle();
      if (!reseller) return json({ error: "Reseller not found" }, 404);
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
        ip_address: ip, user_agent: ua, session_id: sid, status: "active",
      });
      return json({ token, customer, redirect: "/pop-admin/dashboard" });
    }

    if (user_type === "reseller_sub") {
      const { data: subUser } = await supabase
        .from("bw_reseller_users")
        .select("id, reseller_id, name, username, email, mobile, permissions, branch_managers!inner(id, name, client_code, balance, tariff_id, branch_id, district_id, upazila_id)")
        .eq("id", user_id)
        .maybeSingle();
      if (!subUser) return json({ error: "Sub-user not found" }, 404);
      const parent: any = (subUser as any).branch_managers;
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
        ip_address: ip, user_agent: ua, session_id: sid, status: "active",
      });
      return json({ token, customer, redirect: "/pop-admin/dashboard" });
    }

    if (user_type === "bw_customer") {
      const { data: bw } = await supabase
        .from("bw_sale_customers")
        .select("id, customer_name, customer_code, username, pop_id, email, mobile, contact_person, address")
        .eq("id", user_id)
        .maybeSingle();
      if (!bw) return json({ error: "BW customer not found" }, 404);
      const { token, customer, sid } = issueToken({
        sub: bw.id,
        name: bw.customer_name,
        code: bw.customer_code,
        username: bw.username,
        type: "bw_customer",
        pop_id: bw.pop_id,
        email: bw.email,
        mobile: bw.mobile,
        contact_person: bw.contact_person,
        address: bw.address,
      });
      await supabase.from("portal_login_log").insert({
        username: bw.username,
        user_type: "bw_customer",
        ip_address: ip, user_agent: ua, session_id: sid, status: "active",
      });
      return json({ token, customer, redirect: "/portal/dashboard" });
    }

    return json({ error: "Invalid user_type" }, 400);
  } catch (err) {
    console.error("impersonate-portal-user error:", err);
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
