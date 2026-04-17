
User wants ability to enable/disable MikroTik device users (the admin users on the router itself, not PPP clients) directly from the device-admin UI.

## Plan

### 1. Edge function: `toggle-mikrotik-user`
New `supabase/functions/toggle-mikrotik-user/index.ts`:
- Input: `{ device_id, username, disable: boolean }`
- Use native API helper `withMikrotik` + `mikrotikCommand`
- Find user: `/user/print` with `?name=<username>` → get `.id`
- Run `/user/set` with `=.id=<id>` `=disabled=yes|no`
- Return success/error

### 2. UI in `AllDeviceUsers.tsx`
- Add a Switch column "অ্যাক্টিভ" per row (mikrotik rows only)
- On toggle → call edge function via mutation, refresh list
- For non-mikrotik rows, show "—" or hide switch

### 3. Refresh user list after toggle so the disabled flag updates

### Files
- **New:** `supabase/functions/toggle-mikrotik-user/index.ts`
- **Edit:** `src/pages/dashboard/device-admin/AllDeviceUsers.tsx`
