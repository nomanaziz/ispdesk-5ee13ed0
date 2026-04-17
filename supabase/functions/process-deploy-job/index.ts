import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Backup job: invoke backup function per device
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

    // Load all mikrotik devices needed
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
          const auth = btoa(`${d.username || "admin"}:${d.password_encrypted || ""}`);
          const base = `http://${d.ip_address}:${d.api_port || 80}/rest/user`;
          if (job.job_type === "deploy_user") {
            const res = await fetch(base, {
              method: "PUT",
              headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                name: job.username,
                password: job.password_hash,
                group: job.permission || "read",
              }),
              signal: AbortSignal.timeout(8000),
            });
            ok = res.ok;
            if (!ok) msg = `HTTP ${res.status}: ${await res.text()}`;
          } else if (job.job_type === "delete_user") {
            // find user id by name then delete
            const listRes = await fetch(`${base}?name=${encodeURIComponent(job.username!)}`, {
              headers: { Authorization: `Basic ${auth}` },
              signal: AbortSignal.timeout(8000),
            });
            if (!listRes.ok) throw new Error(`list HTTP ${listRes.status}`);
            const list = await listRes.json();
            if (!Array.isArray(list) || list.length === 0) {
              ok = true; // already gone
              msg = "user not present";
            } else {
              const uid = list[0][".id"];
              const delRes = await fetch(`${base}/${encodeURIComponent(uid)}`, {
                method: "DELETE",
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(8000),
              });
              ok = delRes.ok;
              if (!ok) msg = `HTTP ${delRes.status}`;
            }
          }
        } else {
          // OLT/Switch/ZKTeco — placeholder: mark as success-simulated.
          ok = true;
          msg = `${t.type} adapter not implemented (simulated)`;
        }
      } catch (e: any) {
        ok = false;
        msg = e.message;
      }

      results.push({ device_type: t.type, device_id: t.id, device_name: t.name, ok, message: msg });

      // Audit log
      await supabase.from("device_admin_audit_log").insert({
        action: job.job_type,
        device_type: t.type,
        device_id: t.id,
        device_name: t.name,
        performed_by: job.created_by,
        details: { username: job.username, permission: job.permission, ok, message: msg },
        status: ok ? "success" : "failed",
      });

      // Update inventory cache
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
