import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";
import { ftpDownload } from "../_shared/mikrotik-ftp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendBackupEmail(
  toEmail: string,
  deviceName: string,
  fileName: string,
  fileBytes: Uint8Array,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return { ok: false, msg: "RESEND_API_KEY not configured" };
  // base64 encode
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < fileBytes.length; i += chunk) {
    bin += String.fromCharCode(...fileBytes.subarray(i, i + chunk));
  }
  const b64 = btoa(bin);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Backup <onboarding@resend.dev>",
      to: [toEmail],
      subject: `MikroTik backup — ${deviceName} — ${fileName}`,
      html: `<p>Device: <b>${deviceName}</b></p><p>File: <code>${fileName}</code></p><p>Size: ${fileBytes.byteLength} bytes</p>`,
      attachments: [{ filename: fileName, content: b64 }],
    }),
  });
  if (!r.ok) return { ok: false, msg: `Email failed: ${r.status} ${await r.text()}` };
  return { ok: true, msg: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { device_id, formats = ["rsc", "backup"], triggered_by = "manual" } = await req.json();
    if (!device_id) throw new Error("device_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: dev, error: derr } = await supabase
      .from("mikrotik_devices")
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", device_id)
      .single();
    if (derr || !dev) throw new Error("Device not found");

    // Load backup email settings
    const { data: settingRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "backup_email")
      .maybeSingle();
    const settings = (settingRow?.setting_value as any) || {};
    const emailEnabled = !!settings.enabled && !!settings.to;
    const emailTo: string | null = emailEnabled ? settings.to : null;

    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "_");
    const safeName = (dev.name || "device").replace(/[^a-z0-9_-]/gi, "_");
    const created: any[] = [];

    for (const fmt of formats) {
      const isRsc = fmt === "rsc";
      const baseFile = `${safeName}_${ts}`;
      const fullName = isRsc ? `${baseFile}.rsc` : `${baseFile}.backup`;
      let fileBytes: Uint8Array | null = null;
      let errMsg = "";
      let status: string = "failed";
      let filePath: string | null = null;
      let fileSize: number | null = null;

      try {
        // 1. Trigger backup creation on device via API
        await withMikrotik(dev as any, async (conn) => {
          if (isRsc) {
            await mikrotikCommand(conn, "/export", { file: baseFile });
          } else {
            await mikrotikCommand(conn, "/system/backup/save", { name: baseFile });
          }
          // wait for file to materialize
          await new Promise((r) => setTimeout(r, isRsc ? 2500 : 4000));
          // verify exists & get size
          const files = await mikrotikCommand(conn, "/file/print", { "?name": fullName });
          if (files.length === 0) throw new Error(`Device-এ ${fullName} তৈরি হয়নি`);
          fileSize = parseInt(files[0]?.size || "0", 10) || null;
        });

        // 2. Download via FTP (works for both .rsc text and .backup binary)
        try {
          fileBytes = await ftpDownload(
            dev.ip_address,
            dev.username || "admin",
            dev.password_encrypted || "",
            fullName,
          );
          fileSize = fileBytes.byteLength;
        } catch (ftpErr: any) {
          throw new Error(`FTP download ব্যর্থ: ${ftpErr.message}. Device-এ FTP service (port 21) enabled আছে কিনা চেক করুন।`);
        }

        // 3. Upload to storage
        filePath = `mikrotik/${dev.id}/${fullName}`;
        const { error: upErr } = await supabase.storage
          .from("device-backups")
          .upload(filePath, fileBytes, {
            contentType: isRsc ? "text/plain" : "application/octet-stream",
            upsert: true,
          });
        if (upErr) {
          errMsg = `Storage upload failed: ${upErr.message}`;
          status = "failed";
          filePath = null;
        } else {
          status = "completed";
        }

        // 4. Email (best-effort)
        if (status === "completed" && emailEnabled && emailTo && fileBytes) {
          const er = await sendBackupEmail(emailTo, dev.name || "device", fullName, fileBytes);
          if (!er.ok) errMsg = `(saved, email skip: ${er.msg})`;
        }
      } catch (e: any) {
        errMsg = e?.message || String(e);
        status = "failed";
      }

      const { data: bak } = await supabase.from("device_admin_backups").insert({
        device_type: "mikrotik",
        device_id: dev.id,
        device_name: dev.name,
        file_name: fullName,
        file_path: filePath,
        file_size: fileSize,
        backup_format: fmt,
        status,
        triggered_by,
        error_message: errMsg || null,
      }).select().single();

      created.push({ format: fmt, status, file: fullName, error: errMsg || null, id: bak?.id });
    }

    return new Response(JSON.stringify({ success: true, results: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
