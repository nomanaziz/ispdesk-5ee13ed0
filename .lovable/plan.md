## Fix POP Recharge Errors & Remaining=0 Auto-Disable

### Issue 1 — Recharge fails with `record "v_pkg" has no field "mikrotik_server_id"`

**Root cause:** The DB function `pop_recharge_client_days` and the cron `apply-pop-daily-charges` reference `isp_packages.mikrotik_server_id` and `isp_packages.protocol_type`, but the actual columns on `isp_packages` are **`mikrotik_id`** and **`protocol`**. So `v_pkg` (a record from `isp_packages`) has no such fields, and recharge crashes.

**Fix (migration):** Recreate `pop_recharge_client_days` using the correct column names (`v_pkg.mikrotik_id`, `v_pkg.protocol`) and look up the server name via `mikrotik_devices.id = v_pkg.mikrotik_id`. The recharge math (`buy / validity_days × days`, with `min_activation_days` block) stays exactly as approved.

**Fix (edge function):** Update `apply-pop-daily-charges/index.ts` to select `mikrotik_id, protocol` from `isp_packages` instead of the wrong names, and to map them into `pop_daily_charges.server_id` / `protocol_type`.

### Issue 2 — Clients with remaining days = 0 keep getting auto-disabled

**Current behavior:**
- `enforce-expired-disable` (every 15 min) disables every client where `expire_date <= today`.
- `apply-pop-daily-charges` (daily) does the same (`expDate <= today`).

So a manually-enabled client whose `expire_date` is today gets shut off within 15 minutes.

**Fix (per your answers):**
- **Cron skip rule:** Both jobs will treat a client as "expired" only when `expire_date < today` (strictly past). When `expire_date = today` (remaining = 0), cron leaves `mikrotik_status` alone — POP can manually toggle freely all day.
- **Hard lock on truly expired:** When `expire_date < today`, manual enable from POP UI / API will be blocked with a clear error: "Client expired — recharge করুন আগে". This will be enforced at the toggle endpoint (server-side) so neither the dashboard nor the portal can bypass it.

### Files to change

```text
supabase/migrations/<new>.sql        — recreate pop_recharge_client_days with correct isp_packages columns
supabase/functions/apply-pop-daily-charges/index.ts  — use mikrotik_id/protocol; expired only when expire_date < today
supabase/functions/enforce-expired-disable/index.ts  — change .lte("expire_date", today) → .lt("expire_date", today)
supabase/functions/portal-data/index.ts (or the toggle case) — block manual enable when expire_date < today
src/components/reseller/* toggle UI                  — surface the new "expired, recharge first" error nicely
```

### Acceptance

1. The two failing expired clients can be recharged successfully (no `v_pkg` error).
2. A client at remaining = 0 can be enabled by POP and stays enabled across the 15-minute cron tick — until they manually disable or until midnight rolls `expire_date` into the past.
3. Once `expire_date < today`, manual enable returns an error and the client cannot be turned on without a recharge.
