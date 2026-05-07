
# System Audit Log — Design & Build

## Goal
পূর্ণাঙ্গ audit log: কে, কখন, কোন device/IP থেকে login করল, কোন entity-তে কী action (create/update/delete) করল — সব এক জায়গায়। Filter, search, export (CSV/JSON), এবং optional remote forwarding (HTTP webhook / syslog endpoint) সাপেক্ষে মাসিক চার্জ।

## DB changes (migration)

### Extend `system_logs` table
Existing columns: `id, created_at, user_id, device_name, log_message`. Add:
- `action text` — login/logout/create/update/delete/view/export/permission_change/etc.
- `entity_type text` — clients, invoices, packages, users, devices, etc.
- `entity_id uuid`
- `entity_label text` — human-readable name (e.g. client name)
- `severity text default 'info'` — info | warning | error | critical
- `ip_address text`
- `user_agent text`
- `branch_id uuid` — for tenant scoping
- `metadata jsonb default '{}'` — diff, old/new values, route, etc.
- `forwarded boolean default false`
- `forwarded_at timestamptz`

Indexes: `(created_at desc)`, `(user_id)`, `(action)`, `(entity_type)`, `(branch_id)`, `(severity)`.

RLS: admins/super_admins read all; other authenticated users read only their own logs (`user_id = auth.uid()`); INSERT allowed for any authenticated user (so client-side and triggers can write).

### New table: `system_log_forwarders`
Stores remote endpoints configured by admin to push logs to.
- `id uuid pk`, `name text`, `endpoint_type text` (webhook | syslog_http), `url text`, `auth_header text` (encrypted/plain), `enabled bool`, `min_severity text default 'info'`, `event_filter jsonb default '{}'` (action/entity filters), `last_sent_at`, `last_error text`, `failure_count int default 0`, `created_at`, `updated_at`.

RLS: admins only.

### Trigger helper functions
- `log_action(_action, _entity_type, _entity_id, _entity_label, _severity, _metadata)` — SECURITY DEFINER helper that any other trigger can call.
- Generic trigger `audit_table_changes()` attachable to important tables (clients, isp_packages, mikrotik_devices, branch_managers, user_roles) capturing INSERT/UPDATE/DELETE with row diff.

(Phase 1: only attach the trigger to `clients`, `user_roles`, and `branch_managers`. Future tables added incrementally.)

## Edge functions

### `log-event` (POST)
Accepts: `{ action, entity_type, entity_id?, entity_label?, severity?, metadata? }`. Pulls IP from headers (`x-forwarded-for`), user-agent, JWT-extracted user_id, branch_id from profile. Inserts row into `system_logs`. Used by frontend for explicit events (login success/failure, exports, permission grants).

### `forward-system-logs` (cron — every 5 min)
- Reads enabled forwarders from `system_log_forwarders`.
- For each, finds rows with `forwarded = false` matching its filter + severity threshold.
- POSTs JSON batch to `endpoint`. On success: marks rows `forwarded=true, forwarded_at=now()`, updates `last_sent_at`. On failure: increments `failure_count`, stores `last_error`.
- Cap batch size at 500.

### Cron registration
Add pg_cron schedule (every 5 minutes) calling the edge function.

## Frontend

### Sidebar/route
Already exists: `/dashboard/system/system-log`. Replace placeholder.

### `src/pages/dashboard/system/SystemLog.tsx`
- KPI cards: Today's events, Last login attempts, Failed actions, Forwarded count.
- Filter bar: date range, user (search), action (multi), entity_type (multi), severity, IP search, free-text search on entity_label/metadata.
- Table (`@tanstack/react-table` style — manual pagination 50/page):
  Columns: Time, User (avatar+name), Action (badge color by severity), Entity (type · label), IP, Device/UA (truncated), Details (expand row → JSON viewer).
- Top-right buttons: Export CSV / Export JSON (current filtered set), Refresh, "Forwarders" → opens dialog.
- Realtime: subscribe to `system_logs` INSERT, prepend new rows.

### `src/components/system-log/ForwardersDialog.tsx`
List + add/edit/delete `system_log_forwarders`. Fields: name, type, url, auth header, min severity, action/entity filter (chips), enabled toggle, "Test" button (sends one synthetic event via edge function).

### `src/lib/audit.ts`
Helper `logEvent(payload)` — calls edge function. Used in:
- `AuthContext` → on login success/failure, logout
- Mutation hooks for sensitive actions (role changes, deletions) — opt-in by callers
- Route guards for permission-denied attempts

### Export
Client-side: build CSV from current filtered rows (no extra endpoint).

## Severity color mapping (semantic tokens)
- info → muted/secondary
- warning → amber (`bg-amber-500/10 text-amber-600`)
- error → destructive
- critical → destructive with ring

## Out of scope (this round)
- Wide trigger coverage on every table (only 3 critical ones now).
- Encryption-at-rest for forwarder auth headers (store as plain `auth_header` column for MVP; recommend Supabase secrets later).
- SIEM-specific syslog RFC5424 framing — webhook JSON only for MVP.
- Subscription/billing gating for the forwarder feature (UI shows it free; billing comes when SaaS portal is wired).
