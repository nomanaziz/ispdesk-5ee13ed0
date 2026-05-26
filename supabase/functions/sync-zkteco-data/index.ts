import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import {
  CMD,
  createPacket,
  readPacket,
  sendPacket,
  makeCommKey,
  decodeAttendance,
  parseOptionString,
} from "./zkteco.ts";

const encoder = new TextEncoder();

async function fetchFromDevice(opts: {
  host: string;
  port: number;
  commKey: number;
}) {
  const { host, port, commKey } = opts;
  const log: string[] = [];
  log.push(`Connecting to ${host}:${port}...`);
  const conn = await Promise.race<Deno.TcpConn>([
    Deno.connect({ hostname: host, port, transport: "tcp" }),
    new Promise<Deno.TcpConn>((_, rej) => setTimeout(() => rej(new Error(`Connect timeout to ${host}:${port}`)), 8000)),
  ]);
  log.push(`Connected to ${host}:${port}`);

  let sessionId = 0;
  let replyId = 0;

  try {
    // 1. CONNECT
    await sendPacket(conn, createPacket(CMD.CONNECT, 0, 0));
    let resp = await readPacket(conn, 6000);
    sessionId = resp.sessionId;
    replyId = resp.replyId;
    log.push(`CONNECT reply: cmd=${resp.command}, sid=${sessionId}`);

    // 2. AUTH if required
    if (resp.command === CMD.ACK_UNAUTH) {
      log.push(`Auth required, sending CommKey=${commKey}`);
      const authData = makeCommKey(commKey, sessionId);
      await sendPacket(conn, createPacket(CMD.AUTH, sessionId, ++replyId, authData));
      resp = await readPacket(conn, 6000);
      log.push(`AUTH reply: cmd=${resp.command}`);
      if (resp.command !== CMD.ACK_OK) {
        throw new Error(`AUTH failed: command=${resp.command} (check CommKey)`);
      }
    } else if (resp.command !== CMD.ACK_OK) {
      throw new Error(`CONNECT failed: command=${resp.command}`);
    }

    // 3. SerialNumber via OPTIONS_RRQ
    let serialNumber: string | null = null;
    try {
      await sendPacket(conn, createPacket(CMD.OPTIONS_RRQ, sessionId, ++replyId, encoder.encode("~SerialNumber\0")));
      const r = await readPacket(conn, 4000);
      if (r.command === CMD.ACK_OK) {
        serialNumber = parseOptionString(r.data, "~SerialNumber");
        log.push(`Serial: ${serialNumber}`);
      } else {
        log.push(`OPTIONS_RRQ unexpected cmd=${r.command}`);
      }
    } catch (e) {
      log.push(`Serial fetch skipped: ${String(e)}`);
    }

    // 4. ATTLOG_RRQ
    log.push(`Requesting attendance logs`);
    await sendPacket(conn, createPacket(CMD.ATTLOG_RRQ, sessionId, ++replyId));
    let r = await readPacket(conn, 8000);
    let attData = new Uint8Array();

    if (r.command === CMD.PREPARE_DATA) {
      // Then DATA packets, then ACK_OK
      while (true) {
        const next = await readPacket(conn, 8000);
        if (next.command === CMD.DATA) {
          const merged = new Uint8Array(attData.length + next.data.length);
          merged.set(attData);
          merged.set(next.data, attData.length);
          attData = merged;
        } else if (next.command === CMD.ACK_OK) {
          break;
        } else {
          log.push(`Unexpected during DATA: cmd=${next.command}`);
          break;
        }
      }
    } else if (r.command === CMD.ACK_DATA) {
      attData = r.data;
    } else if (r.command === CMD.ACK_OK) {
      attData = r.data;
    } else {
      log.push(`ATTLOG_RRQ unexpected cmd=${r.command}`);
    }

    const records = decodeAttendance(attData);
    log.push(`Decoded ${records.length} attendance records`);

    // 5. EXIT
    try {
      await sendPacket(conn, createPacket(CMD.EXIT, sessionId, ++replyId));
    } catch { /* ignore */ }

    return { serialNumber, records, log };
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { device_id } = await req.json();
    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device, error: deviceErr } = await supabase
      .from("zkteco_devices").select("*").eq("id", device_id).single();
    if (deviceErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (device.connection_type === "adms_push") {
      return new Response(JSON.stringify({
        ok: false,
        code: "ADMS_PUSH_MODE",
        error: "ADMS Push mode-এ device নিজে data push করে; sync button দিয়ে fetch করা যায় না।",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!device.ip_address) {
      return new Response(JSON.stringify({ ok: false, code: "MISSING_IP", error: "IP address missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    try {
      result = await fetchFromDevice({
        host: device.ip_address,
        port: device.port || 4370,
        commKey: device.comm_key || 0,
      });
    } catch (e) {
      console.error("ZK fetch error:", e);
      return new Response(JSON.stringify({
        ok: false,
        code: "DEVICE_UNREACHABLE",
        reachable: false,
        error: `Device সংযোগ ব্যর্থ: ${String(e?.message || e)}`,
        details: String(e),
        troubleshooting: [
          "Router/NAT-এ TCP 4370 port forward আছে কিনা দেখুন",
          "Device LAN IP ঠিক আছে কিনা এবং device online কিনা দেখুন",
          "Firewall/ACL থেকে Supabase outbound IP allow করতে হতে পারে",
          "Public IP থেকে telnet/nc দিয়ে 4370 reachable কিনা test করুন",
          "Reachable না হলে ADMS Push mode ব্যবহার করুন",
        ],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Device log:", result.log.join("\n"));

    // Auto-save serial number if we got it
    const updates: Record<string, any> = { last_sync_at: new Date().toISOString() };
    if (result.serialNumber && !device.serial_number) {
      updates.serial_number = result.serialNumber;
    }
    await supabase.from("zkteco_devices").update(updates).eq("id", device_id);

    // Map device_user_id → employee_id
    const { data: employees } = await supabase
      .from("employees").select("id, device_user_id").not("device_user_id", "is", null);
    const empMap = new Map((employees || []).map((e: any) => [String(e.device_user_id), e.id]));

    let syncedCount = 0;
    const sample: any[] = [];
    for (const rec of result.records) {
      const employeeId = empMap.get(rec.user_id) || null;
      const isCheckIn = rec.punch === 0 || rec.status === 0;
      const { error: insErr } = await supabase.from("zkteco_attendance_logs").insert({
        device_id,
        employee_id: employeeId,
        punch_time: rec.timestamp,
        punch_type: isCheckIn ? "check_in" : "check_out",
        device_user_id: rec.user_id,
      });
      if (insErr) {
        // Likely duplicate or constraint; continue
        continue;
      }
      syncedCount++;
      if (sample.length < 3) sample.push({ user_id: rec.user_id, time: rec.timestamp, type: isCheckIn ? "in" : "out" });
    }

    return new Response(JSON.stringify({
      ok: true,
      serial_number: result.serialNumber,
      total_records: result.records.length,
      synced_count: syncedCount,
      sample,
      log: result.log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("Top-level error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
