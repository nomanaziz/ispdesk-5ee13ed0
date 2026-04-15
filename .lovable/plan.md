

## Plan: Revamp Client List & Billing List Actions

### What's Broken
- Client list action dropdown only has Edit/SMS/View — none functional
- Billing list action buttons (Edit, Receipt) are non-functional
- Missing: Delete, Status Scheduler, Package Change Scheduler
- SMS doesn't send anything

### Changes

**1. `src/pages/dashboard/clients/ClientList.tsx` — Full action bar per row**

Replace the 3-dot dropdown with inline icon buttons (matching reference screenshot):
- **Delete** (Trash icon) — soft delete or remove client with confirmation
- **Status Scheduler** (calendar icon) — opens dialog matching screenshot: Client Status dropdown (Active/12:30AM, Inactive/11:30PM, Personal/12:30AM, Free/12:30AM, Left/11:30PM), Remarks/Note textarea, Execution Date picker. Inserts into `client_schedulers` with `scheduler_type = 'status_scheduler'`
- **Package Change Scheduler** (package icon) — opens dialog matching screenshot: Server select, Protocol Type (PPPoE), Profile Speed (from MikroTik fetch), Package select, Package Rate, Remarks, Execution Date. Inserts into `client_schedulers` with `scheduler_type = 'package_scheduler'`
- **SMS** (message icon) — sends SMS with PPP ID and password (default template)
- **Edit** (edit icon) — navigates to AddClient page with prefilled data for editing
- **View** (eye icon) — navigates to client profile

**2. `src/pages/dashboard/billing/BillingList.tsx` — Same action buttons**

Same icon bar but SMS sends billing info (client code, due amount, last billing date) instead of credentials.

**3. `client_schedulers` table — Add columns for package scheduler data**

Migration to add: `server_id UUID`, `protocol_type TEXT`, `profile_speed TEXT`, `package_id UUID`, `package_rate NUMERIC` to support the Package Change Scheduler form fields.

**4. Status Scheduler Dialog (shared component or inline)**

Fields per screenshot:
- CLIENT STATUS * — Select with options: Active/12:30AM, Inactive/11:30PM, Personal/12:30AM, Free/12:30AM, Left/11:30PM (status + time of execution)
- REMARKS/NOTE * — Textarea
- EXECUTION DATE * — Date picker

**5. Package Change Scheduler Dialog**

Fields per screenshot:
- SERVER * — Select from `mikrotik_devices`
- PROTOCOL TYPE * — Select (PPPoE default)
- PROFILE SPEED * — Fetched from MikroTik via `fetch-mikrotik-profiles`
- PACKAGE * — Select from `isp_packages`
- PACKAGE RATE * — Auto-filled from package, editable
- REMARKS/NOTE — Textarea
- EXECUTION DATE * — Date picker

### Files
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/ClientList.tsx` | Replace dropdown with icon action buttons, add Status & Package scheduler dialogs, SMS send, Delete, Edit navigation |
| `src/pages/dashboard/billing/BillingList.tsx` | Same action buttons, SMS sends billing info |
| DB Migration | Add `server_id`, `protocol_type`, `profile_speed`, `package_id`, `package_rate` to `client_schedulers` |

