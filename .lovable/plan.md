

## লক্ষ্য (Goal)
POP-এর জন্য **Debit History** (admin → POP fund) এবং **Credit History** (POP → daily client charges) — দুইটাই দুই side-এ:

1. **Admin side** (`PopProfile.tsx` view): দুইটা নতুন tab — Debit Transactions + Credit Transactions
2. **POP-Admin side** (`/pop-admin/*`): Fund History menu group → Debit History + Credit History
3. Credit row-এ **eye / view** action → ওই দিনের সব active client-এর per-user breakdown popup

## Approach

### ১. Data backbone: per-day per-client charge log
নতুন table `pop_daily_charges`:
| column | type |
|---|---|
| id | uuid |
| pop_id | uuid (branch_managers.id) |
| branch_id | uuid |
| client_id | uuid (clients.id) |
| client_username | text |
| client_name | text |
| package_id | uuid |
| package_name | text |
| profile | text |
| protocol_type | text |
| server_name | text |
| zone_id, zone_name | uuid/text |
| sub_zone_id, sub_zone_name | uuid/text |
| monthly_rate | numeric |
| daily_rate | numeric |
| charged_amount | numeric |
| pop_balance_before, pop_balance_after | numeric |
| charge_date | date |
| created_at | timestamptz |

Index: `(pop_id, charge_date)`, `(branch_id, charge_date)`, `(client_id, charge_date)`. RLS: admin all, POP own rows (`branch_id = current pop branch`).

### ২. Daily-charge engine
Edge function `apply-pop-daily-charges` (নতুন), schedule `cron.schedule` দৈনিক ১টায়:
- প্রতিটা **prepaid** POP-এর প্রতিটা active client (`billing_status` active/enabled) এর জন্য:
  - daily_rate = monthly_bill ÷ 30
  - `pop_daily_charges` row insert
  - `branch_managers.balance` থেকে subtract
- Transaction-safe, idempotent (একই date-pop-client unique constraint)

পুরাতন data backfill জন্য one-time SQL: যদি balance-এ আগে থেকে deduction হয়ে থাকে (existing trigger বা manual via FundDeductionDialog), সেগুলো `pop_transactions`-এ আছে — সেগুলো credit history-তে দেখানো হবে fallback হিসেবে।

### ৩. Admin UI — `PopProfile.tsx`
বর্তমান tabs-এ যোগ:
- **Debit Transactions**: `branch_funding` থেকে POP-এর সব fund row + payment history (image-173 layout: Funding Date | Amount | Total Paid | Discount | Total Due | Payment Date | Paid Amount | Discount | Remarks | ReceivedBy)
- **Credit Transactions**: `pop_daily_charges` থেকে date-grouped rollup (image-174/177 layout: Date | Total User | Total Credited User | Packages | Profiles | Protocol Types | Servers | Total Credited Amount | Action eye)
- Eye click → modal (image-178 layout): Serial | UserName | Zone | Subzone | Package | Profile | Protocol | Server | Monthly Rate | Daily Rate | Credited Amount | Credited By | Remarks — totals row সহ। Filter: Zone, Sub-zone

দু'টা tab-এ from/to date filter, Generate PDF + CSV button (existing `reportExport` util reuse)।

### ৪. POP-Admin UI — `/pop-admin/*`
`ResellerLayout.tsx` sidebar-এ নতুন group "Fund History":
- `/pop-admin/fund-history/debit` → `PopFundDebitHistory.tsx` (image-175 layout)
- `/pop-admin/fund-history/credit` → `PopFundCreditHistory.tsx` (image-177 layout, eye → image-178 modal)

দুইটা page admin-side wo same component reuse করবে — একটা `<PopDebitHistory popId={..} mode="admin|pop" />` ও `<PopCreditHistory popId={..} mode="admin|pop" />` shared component, `usePopScope()` দিয়ে POP-mode-এ auto branch_id detect।

POP-Admin login করলে শুধু own POP-এর data, admin login করলে selected POP-এর।

### ৫. Files

**Migration:**
- `supabase/migrations/<ts>_pop_daily_charges.sql` — নতুন table + RLS + unique index `(pop_id, client_id, charge_date)`

**Edge function:**
- `supabase/functions/apply-pop-daily-charges/index.ts` — daily cron, idempotent insert + balance update

**Shared components:**
- `src/components/branches/PopDebitHistory.tsx` (image-173/175 layout, both modes)
- `src/components/branches/PopCreditHistory.tsx` (image-174/177 + eye → modal image-178)
- `src/components/branches/PopCreditDetailDialog.tsx` (per-day per-user breakdown popup)

**Admin pages updated:**
- `src/pages/dashboard/branches/PopProfile.tsx` — দুই নতুন tab যোগ

**POP-Admin pages new:**
- `src/pages/reseller/PopFundDebitHistory.tsx`
- `src/pages/reseller/PopFundCreditHistory.tsx`

**Routing:**
- `src/App.tsx` — দুইটা `/pop-admin/fund-history/*` route যোগ
- `src/components/ResellerLayout.tsx` — sidebar-এ "Fund History" group যোগ (Debit + Credit)
- `src/components/ResellerProtectedRoute.tsx` — `require="fund-history"` permission key যোগ

**Types:** `src/integrations/supabase/types.ts` (auto-regen)

## যা বদলাবে না
- Existing `Funding.tsx` / `FundingHistory.tsx` admin pages — অপরিবর্তিত রাখব (parallel, supplemental)
- Existing balance update triggers — অপরিবর্তিত
- `credit_refund_logs` flow (left-client refund) — আলাদা concern

## Apply-এর পরে expected
1. **Admin → POP view** এ "Debit Transactions" + "Credit Transactions" tab দেখাবে (নিচের two existing tabs-এর পাশে)
2. **POP-Admin sidebar**-এ নতুন "Fund History" menu → Debit + Credit
3. **Credit row-এর eye** click → ওই দিন কোন user-এর কত daily rate, total কত — পুরো breakdown
4. Daily cron প্রতিদিন রাতে active client-প্রতি charge log করে balance update করবে
5. PDF/CSV export button দু'টা history page-এ থাকবে
6. From/To date + Zone/Sub-zone filter

