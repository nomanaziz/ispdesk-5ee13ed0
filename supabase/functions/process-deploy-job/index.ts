import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: job, error: jobErr } = await supabase
      .from("device_admin_deploy_jobs")
      .select("*")
      .eq("id", job_id)
      .single();
    if (jobErr || !job) throw new Error("Job not found");

    await supabase.from("device_admin_deploy_jobs").update({ status: "running" }).eq("id", job_id);

    const targets: any[] = Array.isArray(job.target_devices) ? job.target_devices : [];
    const results: any[] = [];

    // Backup job
    if (job.job_type === "backup") {
      for (const t of targets) {
        let ok = false, msg = "";
        try {
          if (t.type === "mikrotik") {
            const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/backup-mikrotik-device`, {
              method: "POST",
              headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
              body: JSON.stringify({ device_id: t.id, formats: job.payload?.formats || ["rsc", "backup"], triggered_by: "scheduled" }),
            });
            const json: any = await r.json();
            ok = !!json.success;
            msg = ok ? "backup ok" : (json.error || "backup failed");
          } else {
            ok = false; msg = `${t.type} backup adapter pending`;
          }
        } catch (e: any) { ok = false; msg = e.message; }
        results.push({ device_type: t.type, device_id: t.id, device_name: t.name, ok, message: msg });
      }
      const allOk = results.every((r) => r.ok);
      const someOk = results.some((r) => r.ok);
      await supabase.from("device_admin_deploy_jobs").update({
        status: allOk ? "completed" : someOk ? "partial" : "failed",
        results, completed_at: new Date().toISOString(),
      }).eq("id", job_id);
      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load mikrotik devices
    const mkIds = targets.filter((t) => t.type === "mikrotik").map((t) => t.id);
    const { data: mkDevices } = mkIds.length
      ? await supabase.from("mikrotik_devices").select("id,name,ip_address,api_port,username,password_encrypted").in("id", mkIds)
      : { data: [] as any[] };
    const mkMap = new Map((mkDevices ?? []).map((d: any) => [d.id, d]));

    for (const t of targets) {
      let ok = false;
      let msg = "";
      try {
        if (t.type === "mikrotik") {
          const d: any = mkMap.get(t.id);
          if (!d) throw new Error("Device not found");

          if (job.job_type === "deploy_user") {
            await withMikrotik(d, async (conn) => {
              // Check if exists; if so, set password/group, else add
              const existing = await mikrotikCommand(conn, "/user/print", { "?name": job.username });
              if (existing.length > 0) {
                const id = existing[0][".id"];
                await mikrotikCommand(conn, "/user/set", {
                  ".id": id,
                  password: job.password_hash || "",
                  group: job.permission || "read",
                });
              } else {
                await mikrotikCommand(conn, "/user/add", {
                  name: job.username,
                  password: job.password_hash || "",
                  group: job.permission || "read",
                });
              }
            });
            ok = true; msg = "user deployed";
          } else if (job.job_type === "delete_user") {
            await withMikrotik(d, async (conn) => {
              const existing = await mikrotikCommand(conn, "/user/print", { "?name": job.username });
              if (existing.length === 0) return; // already gone
              const id = existing[0][".id"];
              await mikrotikCommand(conn, "/user/remove", { ".id": id });
            });
            ok = true; msg = "user removed";
          }
        } else {
          ok = true;
          msg = `${t.type} adapter not implemented (simulated)`;
        }
      } catch (e: any) {
        ok = false;
        msg = e.message;
      }

      results.push({ device_type: t.type, device_id: t.id, device_name: t.name, ok, message: msg });

      await supabase.from("device_admin_audit_log").insert({
        action: job.job_type,
        device_type: t.type,
        device_id: t.id,
        device_name: t.name,
        performed_by: job.created_by,
        details: { username: job.username, permission: job.permission, ok, message: msg },
        status: ok ? "success" : "failed",
      });

      if (job.job_type === "deploy_user" && ok) {
        await supabase.from("device_admin_user_inventory").upsert({
          username: job.username,
          device_type: t.type,
          device_id: t.id,
          device_name: t.name,
          permission: job.permission,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "device_type,device_id,username" });
      } else if (job.job_type === "delete_user" && ok) {
        await supabase.from("device_admin_user_inventory")
          .delete()
          .eq("device_type", t.type)
          .eq("device_id", t.id)
          .eq("username", job.username!);
      }
    }

    const allOk = results.every((r) => r.ok);
    const someOk = results.some((r) => r.ok);
    const finalStatus = allOk ? "completed" : someOk ? "partial" : "failed";

    await supabase.from("device_admin_deploy_jobs").update({
      status: finalStatus,
      results,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    return new Response(JSON.stringify({ success: true, status: finalStatus, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
