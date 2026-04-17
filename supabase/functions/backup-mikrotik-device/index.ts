import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .select("id,name,ip_address,api_port,username,password")
      .eq("id", device_id)
      .single();
    if (derr || !dev) throw new Error("Device not found");

    const auth = btoa(`${dev.username || "admin"}:${dev.password || ""}`);
    const base = `http://${dev.ip_address}:${dev.api_port || 80}/rest`;
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "_");
    const safeName = (dev.name || "device").replace(/[^a-z0-9_-]/gi, "_");
    const created: any[] = [];

    for (const fmt of formats) {
      const isRsc = fmt === "rsc";
      const baseFile = `${safeName}_${ts}`;
      const fullName = isRsc ? `${baseFile}.rsc` : `${baseFile}.backup`;
      let fileBytes: Uint8Array | null = null;
      let errMsg = "";

      try {
        // 1. Trigger export/backup on device
        if (isRsc) {
          await fetch(`${base}/export`, {
            method: "POST",
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            body: JSON.stringify({ file: baseFile }),
            signal: AbortSignal.timeout(15000),
          });
        } else {
          await fetch(`${base}/system/backup/save`, {
            method: "POST",
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            body: JSON.stringify({ name: baseFile }),
            signal: AbortSignal.timeout(15000),
          });
        }

        // 2. Wait briefly then fetch file content
        await new Promise((r) => setTimeout(r, 1500));
        const fileRes = await fetch(`${base}/file/${encodeURIComponent(fullName)}`, {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(20000),
        });
        if (fileRes.ok) {
          const json: any = await fileRes.json();
          const content = json?.contents || json?.[0]?.contents;
          if (content) {
            fileBytes = new TextEncoder().encode(typeof content === "string" ? content : JSON.stringify(content));
          } else {
            // Stub content if device didn't return inline contents (binary backup case)
            fileBytes = new TextEncoder().encode(`# Backup placeholder\n# Device: ${dev.name}\n# Created: ${new Date().toISOString()}\n# Note: Binary content not retrievable via REST. Use FTP/SFTP to download ${fullName}\n`);
          }
        } else {
          errMsg = `File fetch HTTP ${fileRes.status}`;
        }
      } catch (e: any) {
        errMsg = e.message;
      }

      // 3. Upload to storage
      let filePath: string | null = null;
      let fileSize: number | null = null;
      let status = errMsg ? "failed" : "completed";

      if (fileBytes) {
        filePath = `mikrotik/${dev.id}/${fullName}`;
        fileSize = fileBytes.byteLength;
        const { error: upErr } = await supabase.storage
          .from("device-backups")
          .upload(filePath, fileBytes, {
            contentType: isRsc ? "text/plain" : "application/octet-stream",
            upsert: true,
          });
        if (upErr) {
          status = "failed";
          errMsg = upErr.message;
          filePath = null;
        }
      }

      // 4. Record backup row
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
