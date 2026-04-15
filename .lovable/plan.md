

## Plan: Fix IP Validation + Separate Enable/Disable from Connected/Disconnected

### Problem
1. **IP field accepts anything** — "নাফিসা" was accepted as a server IP. Need validation for IP addresses and domain names only.
2. **Connected status is fake** — the Switch just toggles between online/offline in DB. In reality, enable/disable and connected/disconnected are separate concepts:
   - **Enabled/Disabled**: admin control — should the system try to connect?
   - **Connected/Disconnected**: actual reachability — can we communicate with it?

### Changes

**1. Database migration** — Add `enabled` boolean column to `mikrotik_devices`
- Default `true`, not nullable
- New servers start with `enabled = true`, `status = 'unknown'`

**2. `src/pages/dashboard/mikrotik/Servers.tsx`** — UI updates:
- **IP validation**: On submit, validate `ip_address` matches either a valid IPv4 pattern or a domain name (letters, dots, hyphens). Reject random text like "নাফিসা".
- **Switch → Enable/Disable**: The toggle switch controls the `enabled` column, not `status`. Label: "সক্রিয়" (Active).
- **Status indicator (read-only)**: Green dot + "Connected" when `status = 'online'`, red dot + "Disconnected" otherwise. No user toggle — this is determined by actual connectivity checks.
- **New server default status**: `'unknown'` instead of `'online'` — no fake connected state.
- Add "Enabled" column header to table.

**3. Edge function `check-mikrotik-status`** (new) — Real connectivity check:
- Accepts a device ID, fetches its IP/port/credentials from DB
- Attempts a TCP connection to `ip:api_port` with timeout
- Updates `status` to `'online'` or `'offline'` in DB
- Called when user clicks the Refresh/Sync button on a server row

### Files
- 1 new migration (add `enabled` column)
- 1 file edited: `src/pages/dashboard/mikrotik/Servers.tsx`
- 1 new edge function: `supabase/functions/check-mikrotik-status/index.ts`

