import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { device_id } = await req.json();
    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch device details
    const { data: device, error: deviceErr } = await supabase
      .from("zkteco_devices")
      .select("*")
      .eq("id", device_id)
      .single();

    if (deviceErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ZKTeco devices expose a REST API (ZKBioAccess / PULL SDK) over HTTP
    // Common endpoint: http://{ip}:{port}/iclock/cdata?stamp=all
    // This fetches attendance logs in the PULL protocol format
    const deviceUrl = `http://${device.ip_address}:${device.port}`;
    let logs: Array<{
      device_user_id: string;
      punch_time: string;
      punch_type: string;
    }> = [];

    try {
      // Try ZKBioAccess PULL SDK endpoint
      const resp = await fetch(`${deviceUrl}/iclock/cdata?stamp=all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (resp.ok) {
        const text = await resp.text();
        // PULL SDK returns tab-separated values: user_id\ttimestamp\tstatus\tverify
        const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("CMD"));
        for (const line of lines) {
          const parts = line.split("\t");
          if (parts.length >= 2) {
            logs.push({
              device_user_id: parts[0].trim(),
              punch_time: parts[1].trim(),
              punch_type: parseInt(parts[2]?.trim() || "0") === 0 ? "check_in" : "check_out",
            });
          }
        }
      } else {
        // Try alternative ZK Web API endpoint
        const altResp = await fetch(`${deviceUrl}/api/attendance/logs`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${btoa(`${device.api_id || "admin"}:${device.api_password || ""}`)}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (altResp.ok) {
          const data = await altResp.json();
          logs = (data.data || data.records || []).map((r: any) => ({
            device_user_id: String(r.user_id || r.uid || r.enrollNumber),
            punch_time: r.timestamp || r.punch_time || r.time,
            punch_type: (r.status === 0 || r.type === "check_in") ? "check_in" : "check_out",
          }));
        }
      }
    } catch (fetchErr) {
      console.error("Device connection error:", fetchErr);
      return new Response(
        JSON.stringify({
          error: `ডিভাইসে সংযোগ ব্যর্থ (${device.ip_address}:${device.port}). নেটওয়ার্ক চেক করুন।`,
          details: String(fetchErr),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch employee mappings (device_user_id → employee_id)
    const { data: employees } = await supabase
      .from("employees")
      .select("id, device_user_id")
      .not("device_user_id", "is", null);

    const empMap = new Map(
      (employees || []).map((e: any) => [e.device_user_id, e.id])
    );

    // Insert logs and update attendance
    let syncedCount = 0;
    for (const log of logs) {
      const employeeId = empMap.get(log.device_user_id) || null;

      // Insert into zkteco_attendance_logs
      const { data: inserted, error: insertErr } = await supabase
        .from("zkteco_attendance_logs")
        .insert({
          device_id: device_id,
          employee_id: employeeId,
          punch_time: log.punch_time,
          punch_type: log.punch_type,
          device_user_id: log.device_user_id,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Log insert error:", insertErr);
        continue;
      }

      // Auto-update attendance table if employee is mapped
      if (employeeId && inserted) {
        const punchDate = new Date(log.punch_time).toISOString().split("T")[0];
        const punchTimeStr = new Date(log.punch_time).toTimeString().slice(0, 5);

        const field = log.punch_type === "check_in" ? "check_in" : "check_out";

        // Upsert attendance record
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("date", punchDate)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("attendance")
            .update({
              [field]: punchTimeStr,
              source: "device",
              device_log_id: inserted.id,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("attendance").insert({
            employee_id: employeeId,
            date: punchDate,
            [field]: punchTimeStr,
            status: "present",
            source: "device",
            device_log_id: inserted.id,
          });
        }
      }

      syncedCount++;
    }

    // Update device last_sync_at
    await supabase
      .from("zkteco_devices")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", device_id);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: syncedCount,
        total_logs: logs.length,
        mapped_employees: logs.filter((l) => empMap.has(l.device_user_id)).length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
