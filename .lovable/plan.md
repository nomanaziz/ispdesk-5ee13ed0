

## Bandwidth Customer Portal — 5 Mandatory Pages + "Manage Your Clients" Subscription Upgrade

### বর্তমান অবস্থা
`bw_customer` type-এর user log in করলে `/pop-admin` area-এ যায় কিন্তু POP Admin-এর সব sidebar groups দেখে — যা ভুল। এদের জন্য **শুধু ৫টা mandatory page** থাকবে এবং **subscription কিনলে full POP Admin features** unlock হবে।

### Final Sidebar (bw_customer)

```text
🟦 MANDATORY (always visible)
├─ ড্যাশবোর্ড            (/bw/dashboard)
├─ বিলিং ইনভয়েস          (/bw/invoices)
├─ পার্চেজ অর্ডার          (/bw/purchase-orders)
├─ সাপোর্ট টিকেট         (/bw/tickets)
└─ কোম্পানি সেটিংস        (/bw/settings)

🟩 UPGRADE BUTTON (top of sidebar, gradient highlight)
└─ ⭐ Manage Your Clients  → opens pricing modal

🟪 IF subscription ACTIVE → unlocks full POP Admin sidebar
   (Configuration, Employee, Client, Monitoring, SMS, Reports, System, Accounting)
```

### Pricing Slabs (Monthly Subscription)

| User Limit | Price (৳/month) |
|---:|---:|
| 100 | 300 |
| 300 | 800 |
| 500 | 1,500 |
| 800 | 2,500 |
| 1,200 | 4,000 |
| 1,600 | 6,000 |
| 2,000 | 8,000 |
| 3,000 | 10,000 |
| 5,000 | 15,000 |

---

### Implementation — ৪টা Phase

#### Phase 1 — Database (Migration)

**নতুন columns** `bw_sale_customers`-এ:
- `panel_access_enabled boolean default false` — currently active subscription
- `panel_user_limit integer` — purchased slab (100/300/500…)
- `panel_subscription_started_at timestamptz`
- `panel_subscription_expires_at timestamptz` — auto-suspend after this
- `panel_branch_id uuid references branches(id)` — linked POP branch (created on first activation)

**নতুন table** `bw_panel_subscriptions` — full payment & renewal history:
```
id, customer_id, user_limit, monthly_price, paid_amount, payment_method,
period_start, period_end, status (active/expired/cancelled), created_at, created_by
```

**নতুন table** `bw_panel_pricing_slabs` (admin-editable):
```
id, user_limit (unique), monthly_price, display_order, is_active
```
Seed with 9 default slabs.

**RLS** — all 3 tables: customer reads own rows, admins read/write all.

#### Phase 2 — Bandwidth Customer Portal (5 pages)

নতুন folder `src/pages/bw-customer/` with **5 dedicated pages** (POP Admin-এর pages থেকে আলাদা, simpler):
- `BwDashboard.tsx` — Welcome, Balance Due, Last Invoice, Payment Due Date, This Month Paid, Purchase Order Status, Ticket status, Messages, Notices (image-214 অনুযায়ী)
- `BwInvoices.tsx` — Existing `ResellerInvoices` reuse, but routed under `/bw/`
- `BwPurchaseOrders.tsx` — List of purchase orders
- `BwTickets.tsx` — Existing `ResellerTickets` reuse
- `BwSettings.tsx` — Company contact/profile (existing `ResellerSettings` reuse)

নতুন layout `BwCustomerLayout.tsx` — clean 5-item sidebar + prominent "⭐ Manage Your Clients" upgrade card at the top (or bottom if no subscription).

Login routing update (`Login.tsx`):
- `bw_customer` → `/bw/dashboard` (নতুন route)
- `reseller` / `reseller_sub` → `/pop-admin/dashboard` (অপরিবর্তিত)

#### Phase 3 — "Manage Your Clients" Upgrade Flow

**Component** `ManageClientsUpgradeModal.tsx`:
- 9টা pricing card (slab + price + "Choose" button)
- Selected slab → "Pay Now ৳X" button
- Direct online payment via existing payment gateway (`reseller_pgw_payments` table reuse)
- On successful payment → edge function `activate-panel-access`:
  - Insert row in `bw_panel_subscriptions`
  - Set `panel_access_enabled=true`, `panel_user_limit=slab`, `panel_subscription_expires_at=now+1month`
  - Auto-create a `branches` row (if first time) and link `panel_branch_id`
  - Seed default zones/sub-zones via existing `seed_default_pop_hierarchy_for_branch()`
- Show success toast → reload session token (re-login) → POP Admin sidebar unlocks

**Edge function** `activate-panel-access` (service-role):
- Verify payment, create subscription row, update customer, seed defaults

#### Phase 4 — Access Control & Auto-Suspend

**`PortalAuthContext`**: Add `panel_access_enabled`, `panel_user_limit`, `panel_subscription_expires_at`, `panel_branch_id` to JWT claims (issued by `portal-auth` edge function).

**Routing logic** (`App.tsx`):
- `/pop-admin/*` for `bw_customer` → only allowed if `panel_access_enabled=true` and subscription not expired
- Otherwise redirect to `/bw/dashboard`

**`BwCustomerLayout.tsx`**:
- If `panel_access_enabled=true` → also show "🚀 Open POP Admin Panel" link → `/pop-admin/dashboard`

**User-limit enforcement** (DB trigger):
- Before insert on `clients` where `branch_id = panel_branch_id` → check current count vs `panel_user_limit`. Block if exceeded with friendly Bangla error.

**Auto-suspend** (cron edge function `bw-panel-suspend-expired`, daily at 00:01):
- Find all customers where `panel_subscription_expires_at < now()` and `panel_access_enabled=true`
- Set `panel_access_enabled=false`
- Disable all linked clients in MikroTik (existing pattern from prepaid POP)

**Monthly billing** (cron, 1st of month):
- Generate next-month invoice for active panel subscriptions
- Add to existing `bw_sales_invoices` with line item "Panel Subscription — X users"

---

### Files to Create / Modify

**New files:**
- `src/components/BwCustomerLayout.tsx` — 5-item sidebar + upgrade card
- `src/components/ManageClientsUpgradeModal.tsx` — pricing slabs + payment
- `src/pages/bw-customer/BwDashboard.tsx`
- `src/pages/bw-customer/BwInvoices.tsx` (thin wrapper around existing)
- `src/pages/bw-customer/BwPurchaseOrders.tsx`
- `src/pages/bw-customer/BwTickets.tsx` (thin wrapper)
- `src/pages/bw-customer/BwSettings.tsx` (thin wrapper)
- `supabase/functions/activate-panel-access/index.ts`
- `supabase/functions/bw-panel-suspend-expired/index.ts`
- Admin page `src/pages/dashboard/system/PanelPricingSlabs.tsx` (CRUD for slabs)

**Modified files:**
- `src/App.tsx` — new `/bw/*` routes + `bw_customer` access guard on `/pop-admin/*`
- `src/pages/Login.tsx` — route `bw_customer` to `/bw/dashboard`
- `src/contexts/PortalAuthContext.tsx` — extend `PortalCustomer` with panel fields
- `supabase/functions/portal-auth/index.ts` — include panel fields in JWT
- `src/components/ResellerLayout.tsx` — block `bw_customer` from non-panel features (already partially does)

**DB migration:** new columns + 2 new tables + seed 9 slabs + user-limit trigger

**Cron jobs:** daily suspend + monthly billing (via `pg_cron` + `pg_net`)

---

### Outcome

- `bw_customer` login → clean **৫-page dashboard** (image-214 style) with prominent "⭐ Manage Your Clients" upgrade button
- Click upgrade → **9 pricing slabs modal** → online payment → instant POP Admin unlock
- Subscription expired & not renewed → panel auto-suspend, MikroTik disabled, but bandwidth service unchanged (separate billing)
- Admin earns **two revenue streams**: bandwidth + panel subscription, fully separated and auditable

