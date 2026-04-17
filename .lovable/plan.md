

## Device Administration — Centralized Multi-Device Management Module

### Goal
এমন একটা central module যেখান থেকে admin **একসাথে অনেক device-এ** (MikroTik, OLT, Switch, ZKTeco) user deploy/delete, backup নেওয়া, এবং কে কোথায় কী change করেছে সেটা log দেখতে পারবে। এক জায়গায় বসে সব device manage।

### Sidebar Group Name
**"ডিভাইস অ্যাডমিনিস্ট্রেশন" (Device Administration)** — icon: `ShieldCheck`
AppSidebar-এ "MikroTik সার্ভার" group-এর নিচে নতুন group হিসেবে add।

### Sub-menu items (8 pages)
| # | Menu | Route | Purpose |
|---|---|---|---|
| 1 | ড্যাশবোর্ড | `/dashboard/device-admin` | Total devices, active users, last backup, recent activity stats |
| 2 | ডিভাইস ইনভেন্টরি | `/dashboard/device-admin/devices` | All devices (MikroTik+OLT+Switch+ZKTeco) এক table-এ, type filter |
| 3 | ইউজার গ্রুপ | `/dashboard/device-admin/groups` | Device group তৈরি (e.g. "All Dhaka POPs", "Core Routers") |
| 4 | বাল্ক ইউজার ডিপ্লয় | `/dashboard/device-admin/deploy-user` | একটা form → username/password/permission (read/write/full) → multiple device select → একসাথে push |
| 5 | বাল্ক ইউজার ডিলিট | `/dashboard/device-admin/delete-user` | Username search across devices → checkbox select → bulk delete |
| 6 | ব্যাকআপ সেন্টার | `/dashboard/device-admin/backups` | Manual + Scheduled backup, all backup files এক জায়গায় (download/restore) |
| 7 | শিডিউল ম্যানেজার | `/dashboard/device-admin/schedules` | Cron-style: daily/weekly backup schedule per device/group |
| 8 | অডিট লগ | `/dashboard/device-admin/audit-log` | Who did what, when, on which device — filterable timeline |

### Database changes (new migration)

**4 new tables:**

```
device_admin_groups
  id, name, description, created_by, created_at

device_admin_group_members
  id, group_id, device_type ('mikrotik'|'olt'|'switch'|'zkteco'), device_id

device_admin_deploy_jobs
  id, job_type ('deploy_user'|'delete_user'|'backup'),
  username, password_hash, permission ('read'|'write'|'full'),
  target_devices jsonb,           -- [{type, id, name}]
  status ('pending'|'running'|'completed'|'partial'|'failed'),
  results jsonb,                  -- per-device success/error
  created_by, created_at, completed_at

device_admin_audit_log
  id, action ('user_added'|'user_deleted'|'backup_taken'|'restored'|'permission_changed'),
  device_type, device_id, device_name,
  target_username, performed_by, ip_address,
  details jsonb, created_at

device_admin_schedules
  id, schedule_type ('backup'),
  group_id, device_type, device_id,    -- either group OR specific device
  cron_expression, last_run_at, next_run_at,
  enabled, created_by, created_at
```

**Reuse existing**: `mikrotik_backups` (extend with `triggered_by` enum: manual/scheduled/admin), `mikrotik_devices`, `olt_devices`, `pop_devices`, `zkteco_devices`.

**RLS**: All tables — only `is_admin_or_super(auth.uid())` can SELECT/INSERT/UPDATE/DELETE.

### Edge functions (new)
- `device-admin-deploy-user` — Loops through `target_devices`, calls per-type adapters (MikroTik API, OLT CLI, etc.), updates `deploy_jobs.results`, writes `audit_log` per device
- `device-admin-bulk-backup` — Triggers backup on selected devices, stores files in `device-backups` storage bucket
- `device-admin-scheduler` — pg_cron triggered every 5 min, finds due schedules, invokes `bulk-backup`

### Storage
New public-read bucket `device-backups` (admin-only RLS) — central store for all backup files (.backup, .rsc, .cfg).

### UI patterns
- Reuse existing `ConfigCrudPage`, `ReportLayout`, table/dialog components
- Bulk Deploy form: Stepper — (1) Select Devices/Groups → (2) User Details + Permission → (3) Review → (4) Run with progress bar
- Audit Log: Timeline view with filters (device type, action, date, performer) + CSV export
- Backup Center: Tabbed (Manual / Scheduled / Files) with download + restore actions

### Files to create
- Migration: tables + RLS + bucket
- 8 page files under `src/pages/dashboard/device-admin/`
- 3 edge functions under `supabase/functions/`
- Update `src/App.tsx` (8 routes) + `src/components/AppSidebar.tsx` (1 group)

### Notes
- Live URL-এ login করে actual UI দেখা যাবে না (separate workspace), so design existing screenshots + ISP industry standards অনুযায়ী
- Phase 1: Group + Inventory + Audit Log + Manual Backup Center (4 pages) — fastest value
- Phase 2: Bulk Deploy + Delete + Scheduler + Dashboard (advanced, needs edge function adapters)

Confirm: Phase 1 first, or all 8 pages একসাথে?

