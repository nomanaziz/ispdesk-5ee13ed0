import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Try clients table first (PPP username or client_id)
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, client_id, username, password, status, contact, email, address, branch_id, zone_id, sub_zone_id, package_id, monthly_bill")
      .or(`username.eq.${username},client_id.eq.${username}`);

    const client = clients && clients.length > 0 ? clients[0] : null;

    if (client) {
      if (client.password !== password) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (client.status !== "Active") {
        return new Response(
          JSON.stringify({ error: "Account is inactive. Please contact support." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenPayload = {
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
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };

      const token = btoa(JSON.stringify(tokenPayload));

      return new Response(
        JSON.stringify({ token, customer: tokenPayload }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fallback to bw_sale_customers (bandwidth/POP customers)
    const { data: bwCustomer, error } = await supabase
      .from("bw_sale_customers")
      .select("id, customer_name, customer_code, username, password, activity_status, pop_id, email, mobile, contact_person, address")
      .eq("username", username)
      .single();

    if (error || !bwCustomer) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (bwCustomer.password !== password) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (bwCustomer.activity_status !== "Active") {
      return new Response(
        JSON.stringify({ error: "Account is inactive. Please contact support." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenPayload = {
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
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = btoa(JSON.stringify(tokenPayload));

    return new Response(
      JSON.stringify({ token, customer: tokenPayload }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
