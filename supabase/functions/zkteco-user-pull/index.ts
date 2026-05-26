import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { CMD, decodeUsers } from "./zkteco.ts";
import { zkConnect, zkExit, zkReadLongData } from "./zk-connect.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { device_id } = await req.json();
    if (!device_id) {
      return new Response(JSON.stringify({ ok: false, error: "device_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device, error: dErr } = await supabase
      .from("zkteco_devices").select("*").eq("id", device_id).single();
    if (dErr || !device) {
      return new Response(JSON.stringify({ ok: false, error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (device.connection_type === "adms_push") {
      return new Response(JSON.stringify({ ok: false, code: "ADMS_PUSH_MODE", error: "ADMS Push mode-এ user pull সাপোর্ট নেই।" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!device.ip_address) {
      return new Response(JSON.stringify({ ok: false, code: "MISSING_IP", error: "IP missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let users: any[] = [];
    let logArr: string[] = [];
    try {
      const sess = await zkConnect({
        host: device.ip_address,
        port: device.port || 4370,
        commKey: device.comm_key || 0,
      });
      logArr = sess.log;
      try {
        const data = await zkReadLongData(sess, CMD.USERTEMP_RRQ, new Uint8Array([0x05, 0x00, 0x00, 0x00, 0x00]));
        users = decodeUsers(data);
        logArr.push(`Decoded ${users.length} users`);
      } finally {
        await zkExit(sess);
      }
    } catch (e: any) {
      console.error("Pull error:", e);
      return new Response(JSON.stringify({
        ok: false,
        code: "DEVICE_UNREACHABLE",
        error: `User pull ব্যর্থ: ${String(e?.message || e)}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert into staging table
    if (users.length > 0) {
      const rows = users.map((u) => ({
        device_id,
        device_user_id: u.user_id,
        name: u.name || null,
        card_no: u.card_no && u.card_no !== "0" ? u.card_no : null,
        privilege: u.privilege,
        password: u.password || null,
        group_no: u.group_no,
        last_seen_at: new Date().toISOString(),
        raw_data: u,
      }));
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { error } = await supabase.from("zkteco_device_users").upsert(chunk, {
          onConflict: "device_id,device_user_id",
        });
        if (error) console.error("Upsert batch error:", error);
      }
    }

    // Auto-link to employees by matching device_user_id
    if (users.length > 0) {
      const userIds = users.map((u) => u.user_id);
      const { data: emps } = await supabase.from("employees")
        .select("id, device_user_id").in("device_user_id", userIds);
      if (emps && emps.length > 0) {
        for (const e of emps) {
          await supabase.from("zkteco_device_users")
            .update({ mapped_employee_id: e.id })
            .eq("device_id", device_id)
            .eq("device_user_id", e.device_user_id!)
            .is("mapped_employee_id", null);
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      pulled_count: users.length,
      sample: users.slice(0, 5),
      log: logArr,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("Top error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
