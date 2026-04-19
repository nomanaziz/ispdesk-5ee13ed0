

## Issue
Online Client Monitoring shows wrong counts (7 online / 1 offline / 4 — should total 5). Reasons:
1. Pulls ALL clients across ALL MikroTik devices at once → slow + wrong scope
2. Doesn't filter by MikroTik `status='enabled'`
3. Includes left clients
4. No per-device pagination/selection

## User Requirements
1. Show only one MikroTik device at a time (not all 10 at once → could be 40k users)
2. MikroTik devices listed by an `order_no` field (set when device is added) — first device loads by default, click another to switch
3. Only include clients where MikroTik PPPoE `status = 'enabled'` (disabled in MikroTik = excluded)
4. Exclude left clients (`clients.status != 'left'`)
5. Stat counters (Total / Online / Offline) reflect ONLY the currently selected device's enabled, non-left users

## Investigation Needed
- Read `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` to see current query logic
- Check `mikrotik_devices` schema for existing `order_no` field
- Check `mikrotik_clients` for `status` field (enabled/disabled)
- Check Add Device dialog (`src/components/device-admin/AddDeviceDialog.tsx`) and Servers page (`src/pages/dashboard/mikrotik/Servers.tsx`) for where order should be set

## Plan

### Database
- Add `order_no integer` column to `mikrotik_devices` (default = next available number, nullable initially). Migration backfills existing devices with row_number ordered by `created_at`.
- Index on `(order_no)` for fast sort.

### Add/Edit MikroTik Device form
- Add "Order No" numeric input (auto-suggest next number, editable). Files: `src/pages/dashboard/mikrotik/Servers.tsx` (and AddDeviceDialog if used for MikroTik).

### Online Client Monitoring page (`src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`)
Rewrite data flow:
1. **Top bar**: horizontal scrollable list of device "tabs/chips" sorted by `order_no` ASC. Show device name + small online count badge per chip. Click switches active device.
2. **On mount**: auto-select first device (lowest `order_no`).
3. **Active device query** only:
   - Join: `mikrotik_clients` (where `mikrotik_id = selected` AND `status = 'enabled'`) → `clients` (where `status != 'left'`)
   - Returns rows for the selected device only
4. **Stat cards** (Total / Online / Offline / etc.) computed from this filtered set only.
5. **Recheck button**: runs status check only against the currently visible device's users (faster, scoped).
6. Keep existing search/filter controls scoped to the active device's results.
7. Show "Loading device X..." skeleton while switching.

### Files
- Migration: add `order_no` to `mikrotik_devices` + backfill
- `src/pages/dashboard/mikrotik/Servers.tsx` — add Order No field in form, show in list, allow editing
- `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` — full rewrite of data fetching + device switcher UI
- (If Add Device dialog is shared) `src/components/device-admin/AddDeviceDialog.tsx` — add order field for mikrotik type

### Notes
- `mikrotik_clients.status` uses `'enabled'` / `'disabled'` (PPPoE secret state in MikroTik)
- Recheck function in `manage-mikrotik-ppp` already handles per-user lookup — no edge function changes needed, just frontend scopes the user list it sends
- Counts will now match because we exclude disabled-PPPoE and left clients

