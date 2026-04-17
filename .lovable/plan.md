

## সমস্যা বিশ্লেষণ

### 1. Quick Pay "গ্রাহক পাওয়া যায়নি"
- DB-তে `client_id` mixed case-এ আছে: `naeem`, `noman`, `CL001`, `aftabnogor_office`
- `eq()` exact case-sensitive — তাই "NAEEM" বা "Naeem" type করলে fail
- ফলাফল: যাদের বকেয়া আছে তাদেরও "পাওয়া যায়নি" দেখায়
- পাশাপাশি `user_id` ও `contact` (phone) দিয়েও খুঁজা উচিত

### 2. Invoice দেখা যাচ্ছে না (Portal + সবার জন্য)
- Monthly bills `billing` table-এ তৈরি হয় (ইতিমধ্যে 5টা active client-এর April 2026 bill আছে)
- কিন্তু **PortalInvoices.tsx** + **PortalDashboard.tsx** ভুল table পড়ছে — `bw_sales_invoices` (সেটা bandwidth wholesale-এর জন্য)
- Portal-এ client login করলে নিজের bills দেখতে পায় না
- Admin manually `generate-monthly-billing` function call না করলে নতুন মাসের bill তৈরি হয় না (cron নেই)

## সমাধান

### Part A — Quick Pay Search ঠিক করা
File: `src/pages/public/QuickPay.tsx`
- `ilike` দিয়ে case-insensitive search (`client_id`, `user_id`, `contact`, `phone_number` যেকোনোটায় match)
- Trim + lowercase normalize
- বকেয়া summary card যোগ — মোট বকেয়া, পরিশোধিত, এই মাসের অবস্থা স্পষ্টভাবে দেখাবে
- `due > 0` থাকলে "এই গ্রাহকের বকেয়া আছে" highlight badge

### Part B — Portal-এ Monthly Bills দেখানো (সঠিক source)
- নতুন page: `src/pages/portal/PortalBills.tsx` — `billing` table থেকে current customer-এর সব bills দেখাবে (month, amount, paid, due, status, due_date)
- Sidebar menu: "মাসিক বিল" — `PortalLayout.tsx`-এ link যোগ
- Route: `/portal/bills` — `App.tsx`-এ register
- `PortalDashboard.tsx`-এর "Recent Invoices" widget → `billing` table থেকে read করার জন্য fix
- `PortalInvoices.tsx`-কে rename করে BW invoices ই থাকবে (b2b customer-দের জন্য — পরিবর্তন নেই)

### Part C — Auto Invoice Generation (সবার জন্য চালু)
Goal: প্রতি মাসের 1 তারিখে সব active client-এর জন্য bill auto-generate হবে।

1. **এখনই missed months back-fill** — admin manually trigger করার বদলে, এই migration-এ একবার `generate-monthly-billing` function-কে current month-এর জন্য call করা হবে (server-side)
2. **pg_cron schedule** — মাসের 1 তারিখ 00:05-এ auto-run:
```sql
SELECT cron.schedule(
  'monthly-billing-auto',
  '5 0 1 * *',
  $$ SELECT net.http_post(
    url:='https://hdrhscfambaswndxqzau.supabase.co/functions/v1/generate-monthly-billing',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);
```
3. **Manual trigger button** — `src/pages/dashboard/billing/BillingList.tsx`-এ "এই মাসের বিল তৈরি করুন" button (admin চাইলে যেকোনো সময় re-run করতে পারবে)
4. **Status filter ঠিক** — function-এর `in("status", ["active"])` এখন কাজ করবে কিন্তু DB-তে কারো `status='Active'` (capital A) আছে — সেটাও cover করতে `.or("status.eq.active,status.eq.Active")` ব্যবহার করব

### Part D — Bill ↔ Invoice Mapping
যাতে "invoice" শব্দটাও meaningful হয়:
- Portal-এর "মাসিক বিল" page-এ প্রতিটি bill-এর "Invoice দেখুন/Print" button — একটা simple printable invoice view (`/portal/bills/:id`) যেখানে company info + bill detail + due QR/payment info থাকবে
- File: `src/pages/portal/PortalBillInvoice.tsx`

## Files

**New:**
- `src/pages/portal/PortalBills.tsx`
- `src/pages/portal/PortalBillInvoice.tsx`

**Edit:**
- `src/pages/public/QuickPay.tsx` — case-insensitive search + multi-field
- `src/pages/portal/PortalDashboard.tsx` — `billing` table থেকে read
- `src/components/PortalLayout.tsx` — sidebar-এ "মাসিক বিল" menu
- `src/App.tsx` — `/portal/bills`, `/portal/bills/:id` routes
- `src/pages/dashboard/billing/BillingList.tsx` — "এই মাসের বিল তৈরি করুন" button (function invoke)
- `supabase/functions/generate-monthly-billing/index.ts` — `or("active","Active")` status filter

**SQL (insert tool — not migration, has secrets):**
- `pg_cron` + `pg_net` extension enable
- Schedule monthly cron (1st at 00:05)
- One-time call to backfill current month bills

## ফলাফল

- Quick Pay-এ যেকোনো case-এ client খুঁজে পাওয়া যাবে; বকেয়া স্পষ্ট দেখাবে
- প্রতি client portal-এ তার "মাসিক বিল" tab + printable invoice
- প্রতি মাসের 1 তারিখে সব active client-এর জন্য bill automatic তৈরি হবে
- Admin চাইলে ম্যানুয়ালি যেকোনো সময় regenerate করতে পারবে

