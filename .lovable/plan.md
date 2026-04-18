

## Diagnosis (root causes)

DB-তে NAIM-এর সব data সঠিকভাবে আছে (পূর্ণ profile, ৩টা bill, company info)। ৬টা real bug চিহ্নিত:

1. **Stale token** — User আগের পুরনো session-এ login আছে (token-এ `monthly_bill: 1500`, no profile fields)। Re-login করলে সব আসবে — কিন্তু code-এও কিছু gap আছে যা নিচে fix করব।
2. **Portal Bills page** monthly bill list query শুধু "client_id" দিয়ে, but query ঠিকই আছে — সমস্যা হলো বিল্ট-ইন cache পুরনো session-এর। এটা logout/login-এ ঠিক হবে।
3. **CreateTicketDialog** `support_categories` থেকে `name` select করে, কিন্তু DB-তে category name আছে — table-এ `support_categories` rows **৭টা আছে** (নেই, কারণ query empty দেখাল!)। Categories seed করতে হবে।
4. **PortalLedger** শুধু `bw_sales_invoices`/`bw_sale_collections` query করে — client (NAIM) `billing` + `bill_collections` query করে না। তাই ক্লায়েন্ট-দের জন্য ledger সবসময় empty।
5. **Live Usage header** `client.contact` ও joining_date ঠিক pull করে, কিন্তু "Connectivity Information" header section-এর জন্য `clientId` যদি cached/old token থেকে আসে যেখানে `customer.sub` ভুল — re-login-এ ঠিক হবে। তবে **offline-এ "You are Offline" বড় করে দেখানো** নেই — যোগ করব।
6. **Auto monthly billing** নেই — admin-এর জন্য একটা সরল cycle config + প্রতি মাসের ১ তারিখে bill auto-generate।

## যা করব (Phase 1 — এই step-এ)

### A. Data fixes (DB)
- **Support categories seed** (5টা): "Internet Slow", "Disconnected", "Billing", "New Connection", "অন্যান্য"
- **NAIM client্য check** — ইতোমধ্যে complete; কিছু লাগবে না
- **system_settings → billing_cycle_config** seed: `{ mode: "monthly_first", grace_days: 15 }`

### B. Portal frontend fixes
- **`PortalLedger.tsx`**: client type হলে `billing` (debit) + `bill_collections` (credit) query করব; `bw_*` reseller/bw_customer-দের জন্য থাকবে।
- **`PortalLiveUsage.tsx`**: offline হলে graph-এর জায়গায় বড় "You are Offline" empty-state card; header-এ NID/Email/Zone যোগ।
- **`PortalDashboard.tsx`**: "Last Invoice" card-এ click → invoice detail navigate; default billing date show।
- **`PortalBillInvoice.tsx`** (existing): Invoice template uploaded design-এর মত refine — header (company logo+info), client info block, item table, balance due, top-এ red "UNPAID" + "Pay Now" button যদি due > 0।

### C. Auto monthly billing — Admin setup
- নতুন admin page: **`src/pages/dashboard/billing/BillingCycleSettings.tsx`** — radio: "Monthly (1st of month)" / "Date-to-Date (each client's billing_date)" / "Both"
- Edge function `generate-monthly-billing` (already exists per file list) — verify/adjust করব যাতে config পড়ে এবং সব active client-এর জন্য current month-এ bill তৈরি করে (idempotent — duplicate `bill_id` skip)
- Manual trigger button admin page-এ: "Generate this month's bills now"
- Sidebar-এ link

### D. Re-login note
User-কে বলব **logout + re-login** করতে যাতে নতুন token-এ পূর্ণ profile fields আসে।

## যা পরে করব (Phase 2 — না এই step-এ)
- Cron schedule (pg_cron) প্রতি মাসের ১ তারিখে edge function auto-call — এটা separate step-এ
- Date-to-Date cycle daily run logic
- Invoice PDF download

## Files

**New:**
- `src/pages/dashboard/billing/BillingCycleSettings.tsx`

**Edit:**
- `src/pages/portal/PortalLedger.tsx` — client billing + collections support
- `src/pages/portal/PortalLiveUsage.tsx` — offline empty state, extra info rows
- `src/pages/portal/PortalBillInvoice.tsx` — invoice template polish + Pay Now button
- `src/components/AppSidebar.tsx` — add Billing Cycle Settings link
- `src/App.tsx` — route registration
- `supabase/functions/generate-monthly-billing/index.ts` — verify/adjust to read config & be idempotent

**DB migration:**
- Insert 5 support categories
- Upsert `system_settings.billing_cycle_config`

## ফলাফল

- Logout/login-এর পর NAIM dashboard-এ package, speed, NID, zone, email, address, joining date — সব আসবে
- Last Invoice card-এ April 2026 ৳1000 unpaid দেখাবে; click করলে invoice খুলবে
- Live Usage offline হলে clean message + header info পূর্ণ
- Ledger-এ ৩টা invoice (debit) + পেমেন্ট (credit) + running balance
- Support ticket dialog-এ ৫টা category dropdown-এ আসবে
- Invoice page uploaded design-এর মতো clean — UNPAID/PAID badge, company info, "Pay Now" button
- Admin **Billing → Cycle Settings** page থেকে cycle choose এবং manual generate button

