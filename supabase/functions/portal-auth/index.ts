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
    const { username, password } = await req.json();
    if (!username || !password) {
      return json({ error: "Username and password are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const issueToken = (payload: Record<string, unknown>) => {
      const tokenPayload = {
        ...payload,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      return { token: btoa(JSON.stringify(tokenPayload)), customer: tokenPayload };
    };

    // 1. CLIENT (PPP user / client_id)
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, client_id, username, password, billing_status, contact, email, address, branch_id, zone_id, sub_zone_id, package_id, monthly_bill")
      .or(`username.eq.${username},client_id.eq.${username}`)
      .limit(1);

    const client = clients?.[0];
    if (client) {
      if (client.password !== password) return json({ error: "Invalid username or password" }, 401);
      const { token, customer } = issueToken({
        sub: client.id,
        name: client.name,
        code: client.client_id,
        username: client.username,
        type: "client",
        email: client.email,
        mobile: client.contact,
        address: client.address,
        branch_id: client.branch_id,
        zone_id: client.zone_id,
        package_id: client.package_id,
        monthly_bill: client.monthly_bill,
      });
      return json({ token, customer });
    }

    // 2. RESELLER (branch_managers)
    const { data: resellers } = await supabase
      .from("branch_managers")
      .select("id, name, username, password, client_code, contact, email, branch_id, balance, tariff_id, status, portal_enabled")
      .or(`username.eq.${username},client_code.eq.${username},contact.eq.${username},email.eq.${username}`)
      .limit(1);

    const reseller = resellers?.[0];
    if (reseller) {
      if (reseller.password !== password) return json({ error: "Invalid username or password" }, 401);
      if (reseller.portal_enabled === false) return json({ error: "Portal access disabled. Contact admin." }, 403);
      if (reseller.status && reseller.status !== "Active") {
        return json({ error: "Account is inactive. Please contact support." }, 403);
      }
      const { token, customer } = issueToken({
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
      if (bwCustomer.activity_status !== "Active") {
        return json({ error: "Account is inactive. Please contact support." }, 403);
      }
      const { token, customer } = issueToken({
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
      return json({ token, customer });
    }

    return json({ error: "Invalid username or password" }, 401);
  } catch (err) {
    console.error("portal-auth error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
