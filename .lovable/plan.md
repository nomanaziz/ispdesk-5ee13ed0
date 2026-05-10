## Tariff: Remove "Custom" — Always Date-to-Date

### Goal
Admin → Reseller tariff structure simplified. Only **date-to-date** delivery exists. Each package has `validity_days` (default 30) and `min_activation_days` (default 1). The dual radio (Custom / Date-to-Date) goes away. Client self-recharge from portal becomes available the moment a client expires (remaining=0 included), with day-count chosen by the client (subject to `min_activation_days`).

---

### 1. Database migration

- **Backfill existing rows** in `reseller_tariffs`:
  - `tariff_type` = `'date_to_date'` for every row (covert all `'custom'`).
- **Backfill `reseller_tariff_packages`**:
  - `validity_days` → 30 wherever it's NULL or 0.
  - `min_activation_days` → 1 wherever it's NULL or 0.
- Make these the new column **defaults** (`DEFAULT 30` / `DEFAULT 1`) so future inserts get correct defaults even if UI forgets.
- Optional: add a CHECK that `validity_days >= 1` and `min_activation_days >= 1`.

(The pricing function `pop_resolve_client_package_cost` already returns these with sane fallbacks, so no function change needed.)

### 2. Admin Tariff page (`src/pages/dashboard/branches/Tariff.tsx`)

- Drop the `tariffType` state and the Custom / Date-to-Date `RadioGroup`.
- Always submit `tariff_type: "date_to_date"`.
- Show `validity_days` and `min_activation_days` inputs unconditionally on every package row, with defaults `30` and `1`.
- Remove the `tariffType === "date_to_date" ? 0 : ...` branches when building insert payloads.
- TariffChangeLog dialog: keep showing the values; nothing to remove.

### 3. Reseller-side recharge (already correct)

- `pop_recharge_client_days` already enforces `min_activation_days` via the `MIN_DAYS` exception. Leave as-is.
- Bulk recharge dialog already uses `effectiveMin`. Leave as-is.

### 4. Client self-recharge from portal

Currently: portal `Bills` page lets the client pay a generated monthly bill. We're switching to a **package-day recharge** model that mirrors what the reseller does — but initiated by the client, paid through the existing payment-gateway flow.

- New portal endpoint in `portal-data` (client tok scope): `client_get_recharge_quote`
  - Returns `{ buy_price, validity_days, min_activation_days, daily_rate, expire_date, can_recharge }`.
  - `can_recharge = expire_date <= today`.
- New endpoint: `client_create_recharge_payment`
  - Input: `days` (must be ≥ `min_activation_days`).
  - Reject if `expire_date > today` → "এখনো expire হয়নি — recharge করার দরকার নেই"।
  - Computes `amount = round(daily_rate * days, 2)` (uses the **package selling_rate**, not POP buying rate, so the customer pays the retail price — clarify in implementation that we use `pop_package_pricing.pop_selling_rate` falling back to `reseller_tariff_packages.selling_rate`).
  - Creates a `public_payment_request` row (or equivalent) tagged with `purpose='client_recharge'`, `meta={days}`, then returns the gateway URL the existing `bkash-payment` / `nagad-payment` / `sslcommerz-payment` flow uses.
- `payment-callback`: when a paid request has `purpose='client_recharge'`, invoke `pop_recharge_client_days(client_id, days)` after marking paid. The POP wallet is debited at buy-rate exactly like a reseller recharge; the client paid retail. Difference goes to admin/POP margin (already the model).

### 5. Portal UI

- `src/pages/portal/PortalBills.tsx` (or a new `PortalRecharge.tsx` linked from dashboard):
  - Show "Recharge" card only when `can_recharge=true`.
  - Days input with `min={min_activation_days}`, live total = `daily_rate × days`.
  - "Pay" button → triggers `client_create_recharge_payment` → redirects to gateway.
- When `can_recharge=false`: show greyed card "এখনো expire হয়নি, recharge দরকার নেই — expire হলে এখানে option আসবে"।

### 6. Files to change

```text
supabase/migrations/<new>.sql                      — backfill + defaults
src/pages/dashboard/branches/Tariff.tsx            — drop Custom/D2D toggle, default 30/1
supabase/functions/portal-data/index.ts            — client_get_recharge_quote, client_create_recharge_payment
supabase/functions/payment-callback/index.ts       — handle purpose='client_recharge' → call pop_recharge_client_days
src/pages/portal/PortalBills.tsx (or new PortalRecharge.tsx) — recharge UI
src/components/PortalLayout.tsx                    — surface the new menu if separate page
```

### 7. Acceptance

1. Admin tariff form has no Custom radio; every package shows validity & min-activation inputs with defaults 30/1.
2. All existing tariffs show `date_to_date` and have non-zero validity/min-activation in DB.
3. Reseller recharge still respects min_activation_days (unchanged).
4. Portal: an active client sees "no recharge needed". A client at remaining=0 or past expiry sees a Recharge card, picks days (≥ min), pays through gateway, and on payment success their `expire_date` extends and MikroTik enables — exactly like a reseller-initiated recharge.
