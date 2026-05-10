## Plan

### What will be fixed
1. **Show R.Days in reseller Billing List**
   - Remove the old `pop_type === prepaid` condition from the POP billing list.
   - In `/pop-admin/billing/list`, always show the `R.Days` column for reseller/POP mode.
   - Keep admin billing behavior unchanged.

2. **Use the reseller recharge logic from the R.Days cell**
   - Clicking a client's `R.Days` will open the day input.
   - For POP/reseller mode, saving will recharge that client for N days and deduct reseller balance using the existing `monthly_bill / 30` rule.
   - The client `expire_date` will extend from current expiry if still active, otherwise from today.

3. **Add bulk client recharge to the actual reseller Billing List page**
   - Add a `Bulk Client Recharge` action to the existing selected-client action bar on `/pop-admin/billing/list`.
   - Reuse the existing `BulkClientRechargeDialog` so selected clients can be recharged for 1/20/30/etc. days.
   - Show balance, selected count, per-day cost, and total cost like the reference image.

4. **Add per-client auto recharge toggle**
   - Add a client-level `auto_recharge_enabled` flag in `clients`.
   - Add a visible `Auto Recharge` column/toggle in reseller Billing List.
   - If the global reseller setting is ON, only clients with this per-client toggle ON will auto recharge when `R.Days <= 0` / expired.
   - Clients with this toggle OFF will not auto recharge; they must be manually recharged via R.Days or bulk recharge.

5. **Update auto-recharge backend**
   - Update the `reseller-auto-recharge` function to select only:
     - reseller global `auto_recharge_enabled = true`
     - client `auto_recharge_enabled = true`
     - active billing clients
     - MikroTik not disabled
     - `expire_date <= today` or expired/zero remaining day
   - Auto recharge will add 1 day and deduct reseller balance through the same RPC.

6. **Fix labels to match your logic**
   - Settings text will say: global setting enables daily auto recharge, but the client must also have auto recharge enabled.
   - R.Days will be treated as reseller client validity/remaining day, not POP type/prepaid-postpaid logic.

### Technical changes
- Migration:
  - `clients.auto_recharge_enabled boolean default false not null`
- Edge/API:
  - `portal-data.list_pop_billing_clients` includes `auto_recharge_enabled`
  - new action to update a reseller-owned client's auto recharge flag
  - `reseller-auto-recharge` filters by client flag and `expire_date <= today`
- Frontend:
  - `src/pages/dashboard/billing/BillingList.tsx`
  - `src/components/billing/BulkActionButtons.tsx`
  - `src/components/billing/RemainingDaysCell.tsx` if needed for clearer POP labels
  - `src/components/reseller/BulkClientRechargeDialog.tsx` reused/adjusted if needed
  - `src/pages/reseller/ResellerSettings.tsx` label update