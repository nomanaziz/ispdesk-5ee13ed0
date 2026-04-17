

## Device Administration — Round 3 Improvements

পাঁচটা মূল কাজ: (১) Backup দুই format, (২) Add Device dialog vendor + protocol সহ, (৩) Job management (delete/edit/status change), (৪) Per-device "Fetch" action, (৫) সব এক জায়গায় organize।

---

### ১. Backup: `.rsc` + `.backup` দুইটা format

**বর্তমান সমস্যা:** Backup শুধু row insert করে — actual file pull হয় না, status সিমুলেট।

**ফিক্স:**
- নতুন edge function `backup-mikrotik-device` → SSH/API দিয়ে দুইটা command চালাবে:
  - `/export file=<name>` → `.rsc` (text, human-readable config)
  - `/system/backup/save name=<name>` → `.backup` (binary, full restore)
  - তারপর `/file/print` + `/file/print` content fetch করে `device-backups` storage bucket-এ upload করবে
- `device_admin_backups` row-এ `file_path` + `backup_format` (`rsc` | `backup`) save
- Backup Center-এ "Take Backup" করলে dialog: ☑ `.rsc` ☑ `.backup` (default দুইটাই)
- Download button working হবে (signed URL)
- অন্য device (OLT/Switch): SSH দিয়ে `show running-config` capture → `.txt` (পরে real adapter)

**Migration:** `device_admin_backups`-এ `backup_format text` + `file_size bigint` add।

---

### ২. Add Device Dialog (Universal)

আপনার screenshot অনুযায়ী **`/dashboard/device-admin/devices`** page-এ "+ Add Device" button + dialog যোগ:

```text
Name | Type
IP   | Port
[Type ≠ mikrotik হলে দেখাবে:]
Connection Protocol: ⚪ SSH  ⚪ Telnet
Vendor sub-type: Juniper / Huawei / BDCOM OLT / C-Data OLT / Cisco / MikroTik-RouterOS / Generic
Enable Password (Cisco/Huawei privileged mode)
Username | Password
Location | Group
Backup Schedule: Manual / Daily / Weekly
[Add Device]
```

- Type select থেকে category pick: **MikroTik** / **OLT** / **Switch** / **ZKTeco** / **Generic**
- MikroTik হলে existing `mikrotik_devices` table-এ insert
- বাকি সব নতুন unified table **`device_admin_managed_devices`**-এ যাবে (vendor, protocol, enable_password সহ) — যাতে আগের OLT/POP table-এর সাথে সংঘর্ষ না হয় কিন্তু এখান থেকেও inventory-তে দেখায়
- Inventory query-তে এই table merge হবে

**Migration:**
```sql
device_admin_managed_devices (
  id uuid pk, name text, category text, -- mikrotik|olt|switch|other
  vendor text, -- juniper|huawei|bdcom|cdata|cisco|mikrotik|generic
  protocol text, -- ssh|telnet|api
  ip_address inet, port int,
  username text, password_encrypted text, enable_password text,
  location text, group_id uuid, backup_schedule text default 'manual',
  status text default 'unknown', created_at, updated_at
)
```

---

### ৩. Job Management (পেন্ডিং জব ঠিক করার ব্যবস্থা)

**নতুন page:** `/dashboard/device-admin/jobs` → "জব ম্যানেজমেন্ট" sidebar item

**Table:** Job ID | Type | Username | Devices | Status | Created | Actions

**Per-row actions:**
- 🔄 **Retry** (re-invoke `process-deploy-job`)
- ✏️ **Status change** (manual: pending → completed / failed / cancelled)
- 🗑️ **Delete** (single বা bulk)
- 👁️ **Details** (results JSON, per-device success/fail)

**Bulk:** checkbox + "Delete Selected" / "Cancel Pending" / "Retry Failed"

**Auto-update:** existing executor already updates status on completion — job page realtime refresh (every 5s) করে দেখাবে।

**Filter:** Status (pending/running/completed/failed/partial) + Type (deploy_user/delete_user/backup) + Date range

---

### ৪. Per-Device "Fetch" Action

**Inventory table-এর প্রতিটা row-এ নতুন action icon**: 🔍 "Inspect Device"

Click → **DeviceInspectorDialog** opens (tabs):
- **Users** — all system users + permissions (MikroTik: `/user/print`)
- **Interfaces** — all `/interface/print` (name, type, MAC, status, MTU)
- **Live Bandwidth** — selected interface-এ `/interface/monitor-traffic` (rx/tx bps, real-time chart)
- **VLANs** — `/interface/vlan/print` (vlan-id, interface, name)
- **VLAN IPs** — `/ip/address/print` filtered by vlan interfaces

**নতুন edge function:** `inspect-device` → `{device_id, resource: "users"|"interfaces"|"vlans"|"vlan_ips"|"monitor"}` → MikroTik API call → JSON return

OLT/Switch (SSH): later phase, button দেখাবে কিন্তু "vendor adapter pending"।

---

### ৫. Reorganized Sidebar

```text
ডিভাইস অ্যাডমিনিস্ট্রেশন
  ├─ ড্যাশবোর্ড
  ├─ ডিভাইস ইনভেন্টরি   (Add/Inspect/Deploy/Remove)
  ├─ অল ডিভাইস ইউজার
  ├─ জব ম্যানেজমেন্ট    ← নতুন
  ├─ ব্যাকআপ সেন্টার    (.rsc + .backup)
  ├─ শিডিউল ম্যানেজার
  ├─ গ্রুপ
  └─ অডিট লগ
```

---

### Files (summary)

**New:**
- `src/components/device-admin/AddDeviceDialog.tsx`
- `src/components/device-admin/DeviceInspectorDialog.tsx`
- `src/pages/dashboard/device-admin/Jobs.tsx`
- `supabase/functions/backup-mikrotik-device/index.ts`
- `supabase/functions/inspect-device/index.ts`

**Edit:**
- `Devices.tsx` — Add Device button + Inspect action per row + merge `device_admin_managed_devices`
- `Backups.tsx` — format checkboxes, real download via signed URL, call new backup function
- `AppSidebar.tsx` + `App.tsx` — Jobs route
- `process-deploy-job/index.ts` — handle `backup` job_type by invoking new backup function

**Migration:**
- Create `device_admin_managed_devices` + RLS (admin only)
- Add `backup_format`, `file_size` to `device_admin_backups`
- Add `cancelled` to allowed `device_admin_deploy_jobs.status`

---

### Priority order
1. Job Management page (highest — pending jobs আটকে আছে)
2. Add Device dialog with vendor/protocol
3. Real backup with `.rsc` + `.backup`
4. Device Inspector (fetch users/interfaces/VLANs)

সব একই session-এ implement হবে।

