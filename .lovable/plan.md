
User reports MikroTik backup not actually creating files on the device. Job shows "completed" but MikroTik `/file` directory is empty.

## Root cause analysis

Looking at `backup-mikrotik-device/index.ts`:
- Uses **REST API** (`http://ip:port/rest/export` and `/system/backup/save`)
- AFTABNAGAR device uses port **8523 = native binary API**, not REST
- So the POST requests silently fail (timeout/connection refused) → caught in try/catch → falls through to "stub placeholder content" path → uploads a fake text file to storage → marks status as `completed`
- That's why job looks ✅ but device has no real backup file

This is the **same bug** I just fixed for `inspect-device`/`process-deploy-job`/`fetch-device-users` — backup function was missed.

## Fix plan

### 1. Rewrite `backup-mikrotik-device/index.ts` to use native binary API

Use the new `_shared/mikrotik-api.ts` helper. Commands:

**For `.rsc` (text export):**
- Send `/export` with `=file=<name>` → device creates `<name>.rsc` in its file system
- Wait 2-3 seconds for file generation
- Send `/file/print` with `?name=<name>.rsc` → confirm exists, get size
- Send `/file/print` with `=.proplist=contents` and `?name=<name>.rsc` → fetch text contents
- Upload to `device-backups` storage

**For `.backup` (binary):**
- Send `/system/backup/save` with `=name=<name>` → device creates `<name>.backup`
- Wait, then `/file/print` to confirm
- ⚠️ Binary `.backup` files **cannot** be read via API (only via FTP/SFTP/Winbox download). Two options:
  - **(a)** Mark as "created on device" with file path reference, status `completed_on_device`, no upload — user downloads manually from MikroTik
  - **(b)** Try FTP fetch (would need new credential field — out of scope now)
  - → Go with **(a)** + clear message: "ফাইল device-এ তৈরি হয়েছে — Winbox/FTP দিয়ে download করুন"

### 2. Verify file actually exists before marking completed
- After save command, MUST do `/file/print ?name=...` and check returned rows
- If 0 rows → status `failed` with error "Device-এ ফাইল তৈরি হয়নি"
- This prevents fake-completed status

### 3. Update DB row to capture `device_file_path`
- Add note column reuse: store device-side path in `error_message` field (or just use `file_name`) so user knows where to grab the binary
- For `.rsc` (uploaded): `file_path` = storage path, downloadable from UI ✅
- For `.backup` (device-only): `file_path` = null, but new flag in `error_message`: `"📁 Device path: /<name>.backup — download via Winbox/FTP"`

### 4. UI tweak in `Backups.tsx`
- For `.backup` rows with no `file_path` but `completed` status → show info icon with tooltip explaining device-side download
- Disable Download button accordingly (already does)

### Files to edit
- **Edit:** `supabase/functions/backup-mikrotik-device/index.ts` — full rewrite using native API
- **Edit:** `src/pages/dashboard/device-admin/Backups.tsx` — better status messaging for `.backup`

### Files NOT changed
- `_shared/mikrotik-api.ts` already has needed helpers
- DB schema unchanged

### Result
- `.rsc` ব্যাকআপ → device-এ তৈরি হবে + storage-এ upload হবে → UI থেকে download করা যাবে
- `.backup` ব্যাকআপ → device-এ তৈরি হবে → UI-তে দেখাবে "Device-এ আছে, FTP দিয়ে নিন"
- যদি device-এ ফাইল তৈরি না হয় → status `failed` দেখাবে (আর fake completed না)
