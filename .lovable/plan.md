## Plan

1. **Fix single-client billing/expire date change**
   - In the client list date editor, when the new expiry/billing date becomes future/valid, update `expire_date` and also set `mikrotik_status = 'enabled'`.
   - After saving the date, call the existing `manage-mikrotik-ppp` Edge Function with `action: 'enable'` so the MikroTik PPP secret is turned on automatically.
   - If MikroTik enable fails, keep the date update saved but show a clear warning toast so the admin knows the router action failed.

2. **Fix bulk date extension**
   - When bulk extending expiry dates, detect clients whose new date is not expired.
   - For those clients, update database status to enabled and call `manage-mikrotik-ppp` with `action: 'enable'`.
   - Keep existing optional “mark bill paid” behavior unchanged.

3. **Unlock manual enable/disable after date extension**
   - Update the MikroTik switch disable logic on `/dashboard/clients/home` so it uses the effective expiry date (`temp_expire_date || expire_date`) instead of only the old `expire_date`.
   - Once the effective date is in the future, the switch becomes clickable again and manual on/off works normally.

4. **Make expiry checks consistent**
   - Use the same effective-date helper in the switch and in `handleToggleMikrotik` so UI state and action guard match.
   - Treat today-or-past as expired, future date as active/allowed.

5. **Validation**
   - Verify by checking the affected files and running a targeted test/lint-safe inspection of the changed logic.
   - Confirm no service-role key is exposed to the frontend; frontend only calls the existing Edge Function with the anon client.