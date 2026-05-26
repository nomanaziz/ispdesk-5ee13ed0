import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { CMD, createPacket, readPacket, sendPacket, encodeUser } from "../sync-zkteco-data/zkteco.ts";
import { zkConnect, zkExit } from "../_shared/zk-connect.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { device_id, employee_ids, action = "push" } = await req.json();
    if (!device_id || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "device_id ও employee_ids দরকার" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device } = await supabase.from("zkteco_devices").select("*").eq("id", device_id).single();
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (device.connection_type === "adms_push") {
      return new Response(JSON.stringify({ ok: false, code: "ADMS_PUSH_MODE", error: "ADMS Push mode-এ direct push সাপোর্ট নেই।" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!device.ip_address) {
      return new Response(JSON.stringify({ ok: false, code: "MISSING_IP", error: "IP missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: employees, error: eErr } = await supabase
      .from("employees")
      .select("id, employee_id, name, device_user_id, punch_card_id")
      .in("id", employee_ids);
    if (eErr || !employees || employees.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Employees not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sess = await zkConnect({
      host: device.ip_address,
      port: device.port || 4370,
      commKey: device.comm_key || 0,
    });

    const results: any[] = [];
    try {
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const userCode = (emp.device_user_id || emp.employee_id || String(i + 1)).toString();
        const uid = (i + 1) & 0xffff;

        try {
          if (action === "delete") {
            // DELETE_USER: payload = user_id ascii (24 bytes)
            const payload = new Uint8Array(24);
            new TextEncoder().encodeInto(userCode.slice(0, 23), payload);
            await sendPacket(sess.conn, createPacket(CMD.DELETE_USER, sess.sessionId, ++sess.replyId, payload));
            const r = await readPacket(sess.conn, 6000);
            results.push({ employee_id: emp.id, user_code: userCode, ok: r.command === CMD.ACK_OK, cmd: r.command });
          } else {
            const data = encodeUser({
              uid,
              user_id: userCode,
              name: emp.name || userCode,
              privilege: 0,
              password: "",
              card_no: emp.punch_card_id || "0",
              group_no: 1,
            });
            await sendPacket(sess.conn, createPacket(CMD.USER_WRQ, sess.sessionId, ++sess.replyId, data));
            const r = await readPacket(sess.conn, 6000);
            const ok = r.command === CMD.ACK_OK;
            results.push({ employee_id: emp.id, user_code: userCode, ok, cmd: r.command });

            if (ok) {
              // Save the device_user_id back to employees + zkteco_device_id
              await supabase.from("employees").update({
                device_user_id: userCode,
                zkteco_device_id: device_id,
              }).eq("id", emp.id);
            }
          }
        } catch (innerErr: any) {
          results.push({ employee_id: emp.id, user_code: userCode, ok: false, error: String(innerErr?.message || innerErr) });
        }
      }

      // Tell device to refresh internal data
      try {
        await sendPacket(sess.conn, createPacket(CMD.REFRESHDATA, sess.sessionId, ++sess.replyId));
        await readPacket(sess.conn, 4000);
      } catch { /* ignore */ }
    } finally {
      await zkExit(sess);
    }

    const successCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({
      ok: true,
      action,
      total: employees.length,
      success: successCount,
      failed: employees.length - successCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("Push error:", e);
    return new Response(JSON.stringify({
      ok: false,
      code: "DEVICE_UNREACHABLE",
      error: String(e?.message || e),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
