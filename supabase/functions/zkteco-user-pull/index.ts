import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { CMD, createPacket, readPacket, sendPacket, decodeUsers, parseOptionString } from "./zkteco.ts";
import { zkConnect, zkExit, zkReadLongData, zkReadWithBuffer } from "./zk-connect.ts";

const encoder = new TextEncoder();

async function tryGetUserCount(sess: any, log: string[]): Promise<number | null> {
  try {
    await sendPacket(sess.conn, createPacket(CMD.OPTIONS_RRQ, sess.sessionId, ++sess.replyId, encoder.encode("~UserCount\0")));
    const r = await readPacket(sess.conn, 4000);
    if (r.command === CMD.ACK_OK) {
      const v = parseOptionString(r.data, "~UserCount");
      log.push(`~UserCount=${v}`);
      return v ? parseInt(v, 10) : null;
    }
    log.push(`~UserCount unexpected cmd=${r.command}`);
  } catch (e: any) {
    log.push(`~UserCount failed: ${e?.message || e}`);
  }
  return null;
}

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
    let userCount: number | null = null;
    try {
      const sess = await zkConnect({
        host: device.ip_address,
        port: device.port || 4370,
        commKey: device.comm_key || 0,
      });
      logArr = sess.log;
      try {
        // Try to get advertised user count first (helps diagnose empty responses)
        userCount = await tryGetUserCount(sess, logArr);

        // Strategy A: pyzk-style read_with_buffer
        let data: Uint8Array | null = null;
        try {
          data = await zkReadWithBuffer(sess, CMD.USERTEMP_RRQ, 0, 0);
          logArr.push(`[A] buffer bytes=${data.length}`);
          users = decodeUsers(data);
          logArr.push(`[A] decoded ${users.length} users`);
        } catch (e: any) {
          logArr.push(`[A] failed: ${e?.message || e}`);
        }

        // Strategy B: plain USERTEMP_RRQ with no payload → PREPARE_DATA stream
        if (users.length === 0) {
          try {
            const d = await zkReadLongData(sess, CMD.USERTEMP_RRQ, new Uint8Array());
            logArr.push(`[B] bytes=${d.length}`);
            const u = decodeUsers(d);
            logArr.push(`[B] decoded ${u.length} users`);
            if (u.length > 0) users = u;
          } catch (e: any) {
            logArr.push(`[B] failed: ${e?.message || e}`);
          }
        }

        // Strategy C: legacy USERTEMP_RRQ with 5-byte payload [0x05,0,0,0,0]
        if (users.length === 0) {
          try {
            const d = await zkReadLongData(sess, CMD.USERTEMP_RRQ, new Uint8Array([0x05, 0x00, 0x00, 0x00, 0x00]));
            logArr.push(`[C] bytes=${d.length}`);
            const u = decodeUsers(d);
            logArr.push(`[C] decoded ${u.length} users`);
            if (u.length > 0) users = u;
          } catch (e: any) {
            logArr.push(`[C] failed: ${e?.message || e}`);
          }
        }
      } finally {
        await zkExit(sess);
      }
    } catch (e: any) {
      console.error("Pull error:", e);
      return new Response(JSON.stringify({
        ok: false,
        code: "DEVICE_UNREACHABLE",
        error: `User pull ব্যর্থ: ${String(e?.message || e)}`,
        log: logArr,
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

    const warning = users.length === 0
      ? (userCount && userCount > 0
        ? `Device-এ ${userCount} জন user আছে, কিন্তু firmware কোনো recognized command-এ user data return করেনি। Device firmware/model জানালে আমরা আরো command চেষ্টা করতে পারি।`
        : `Device 0 user report করেছে — machine-এ আগে user enroll করা হয়েছে কিনা চেক করুন (Menu → User Mgt)।`)
      : null;

    return new Response(JSON.stringify({
      ok: true,
      pulled_count: users.length,
      device_user_count: userCount,
      warning,
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
