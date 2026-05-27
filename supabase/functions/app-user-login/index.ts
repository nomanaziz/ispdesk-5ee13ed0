// App User Login bridge — resolves username/password against app_users
// and lazy-provisions a Supabase auth account with a synthetic email.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYNTHETIC_DOMAIN = "appuser.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return json({ error: "username এবং password লাগবে" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // Find app_user (case-insensitive username + exact password)
    const { data: user, error } = await admin
      .from("app_users")
      .select("id, username, password, status, user_type, auth_user_id, email, access_expires_at")
      .ilike("username", username.trim())
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!user) return json({ error: "Username বা password ভুল" }, 401);
    if (String(user.password) !== password) return json({ error: "Username বা password ভুল" }, 401);
    if (String(user.status).toLowerCase() !== "active") return json({ error: "অ্যাকাউন্ট নিষ্ক্রিয়" }, 403);
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) {
      return json({ error: "অ্যাকসেসের মেয়াদ শেষ" }, 403);
    }

    let email = user.email as string | null;

    // Lazy provision Supabase auth account
    if (!user.auth_user_id) {
      email = `${String(user.username).toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${SYNTHETIC_DOMAIN}`;
      // Try create; if exists, look it up
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { app_user_id: user.id, username: user.username, source: "app_user" },
      });

      let authUserId = created?.user?.id;
      if (createErr || !authUserId) {
        // Maybe already exists — find by email
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email!.toLowerCase());
        if (existing) {
          authUserId = existing.id;
          // Sync password so login works
          await admin.auth.admin.updateUserById(authUserId, { password });
        } else {
          return json({ error: "Auth account তৈরি করা যায়নি: " + (createErr?.message ?? "unknown") }, 500);
        }
      }

      await admin.from("app_users").update({ auth_user_id: authUserId, email }).eq("id", user.id);
    } else {
      // Ensure password matches current app_users password (in case admin reset it)
      await admin.auth.admin.updateUserById(user.auth_user_id, { password });
      if (!email) {
        const { data: au } = await admin.auth.admin.getUserById(user.auth_user_id);
        email = au?.user?.email ?? null;
        if (email) await admin.from("app_users").update({ email }).eq("id", user.id);
      }
    }

    return json({ ok: true, email });
  } catch (e: any) {
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
