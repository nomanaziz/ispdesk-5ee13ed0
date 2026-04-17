import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withMikrotik, mikrotikCommand } from "../_shared/mikrotik-api.ts";

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
      .select("id,name,ip_address,api_port,username,password_encrypted")
      .eq("id", device_id)
      .single();
    if (derr || !dev) throw new Error("Device not found");

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
        await withMikrotik(dev as any, async (conn) => {
          if (isRsc) {
            // 1. Trigger export to file on device
            await mikrotikCommand(conn, "/export", { file: baseFile });
            // 2. Wait for file generation
            await new Promise((r) => setTimeout(r, 2500));
            // 3. Verify file exists
            const files = await mikrotikCommand(conn, "/file/print", { "?name": fullName });
            if (files.length === 0) {
              throw new Error("Device-এ .rsc ফাইল তৈরি হয়নি");
            }
            const sizeStr = files[0]?.size || "0";
            fileSize = parseInt(sizeStr, 10) || null;
            // 4. Fetch file contents (text)
            const contentRows = await mikrotikCommand(conn, "/file/print", {
              "?name": fullName,
              ".proplist": "contents",
            });
            const contents = contentRows[0]?.contents || "";
            if (!contents) {
              throw new Error("ফাইলের contents পড়া যায়নি (size: " + sizeStr + ")");
            }
            fileBytes = new TextEncoder().encode(contents);
            fileSize = fileBytes.byteLength;
          } else {
            // Binary backup
            await mikrotikCommand(conn, "/system/backup/save", { name: baseFile });
            await new Promise((r) => setTimeout(r, 3000));
            const files = await mikrotikCommand(conn, "/file/print", { "?name": fullName });
            if (files.length === 0) {
              throw new Error("Device-এ .backup ফাইল তৈরি হয়নি");
            }
            fileSize = parseInt(files[0]?.size || "0", 10) || null;
            // Binary content can NOT be retrieved via API — only via FTP/Winbox
            // Mark as completed-on-device
          }
        });

        if (isRsc && fileBytes) {
          // Upload .rsc to storage
          filePath = `mikrotik/${dev.id}/${fullName}`;
          const { error: upErr } = await supabase.storage
            .from("device-backups")
            .upload(filePath, fileBytes, {
              contentType: "text/plain",
              upsert: true,
            });
          if (upErr) {
            status = "failed";
            errMsg = `Storage upload failed: ${upErr.message}`;
            filePath = null;
          } else {
            status = "completed";
          }
        } else if (!isRsc) {
          // .backup created on device, not downloadable via API
          status = "completed";
          errMsg = `📁 Device path: /${fullName} — Winbox/FTP দিয়ে download করুন`;
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
