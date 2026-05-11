## Plan

1. **Fix MikroTik create/update/delete for Bandwidth Admin**
   - Stop writing `mikrotik_devices` directly from the BW portal, because BW portal sessions are custom portal tokens and do not satisfy Supabase `auth.uid()` RLS policies.
   - Add secure `portal-data` actions for BW/POP-scoped MikroTik device management:
     - list devices for the active panel branch
     - create device in the customer’s `panel_branch_id`
     - update/delete/toggle only devices belonging to that branch
   - Keep panel subscription validation: if `panel_access_enabled` is false or expired, return a controlled error instead of allowing writes.

2. **Fix BW panel pages that show repeated “Not allowed” errors**
   - Extend the already-started `isPopScopedToken + resolvePopContext` pattern to the POP endpoints reused by BW panel pages, including:
     - add-client metadata: `get_client_form_meta`
     - client detail/profile
     - billing list, daily collection, bill receive
     - scheduler, employee, SMS/template, dashboard/report/recharge related actions that are used inside `/bw/panel/*`
   - Replace hardcoded `tok.type === reseller/reseller_sub` checks with branch-scoped checks where BW admin should be allowed.
   - Make sure every action uses the resolved branch context, not an untrusted branch id from the browser.

3. **Update BW MikroTik page frontend**
   - Change `BwPanelMikrotikServers.tsx` to call `portal-data` for create/update/delete/toggle instead of direct Supabase table mutations.
   - Keep direct reads only if safe, or move reads to the new portal action for consistency.
   - Show user-friendly Bengali errors such as “প্যানেল active নয়” or “POP branch পাওয়া যায়নি” instead of raw RLS messages.

4. **Fix BW add-client navigation after save**
   - `AddClient.tsx` currently redirects POP-mode saves to `/pop-admin/clients`; in BW panel context it should redirect back to `/bw/panel/clients`.
   - Also update the back/navigation behavior where reused POP pages still point to `/pop-admin/*`.

5. **Replace old uploaded Icons8 icons in BW sidebar**
   - Remove `Icons8Icon` / `hasIcons8Icon` usage from `BwCustomerLayout.tsx`.
   - Use the same app pattern as the main admin sidebar: Lucide icons rendered through `MenuIconTile` with `tintForLabel`.
   - Add BW-specific tint labels where needed so Dashboard, Billing, MikroTik, Clients, SMS, Reports, etc. look consistent.

6. **Improve BW sidebar active link colors and pattern**
   - Align active parent and child menu styling with `AppSidebar`: left indicator, semantic `sidebar-*` tokens, clean active background, and readable text.
   - Keep only active panel menus visible when subscription is active; otherwise keep only billing/admin relationship menus plus the unlock panel CTA.

7. **Validate the flow**
   - Check `/bw/panel/mikrotik` create-device path no longer hits direct RLS failures.
   - Check `/bw/panel/clients/add` no longer returns `Not allowed` for `get_client_form_meta`.
   - Check BW sidebar icons and active colors on `/bw/invoices`, `/bw/dashboard`, and `/bw/panel/mikrotik`.