

## কাজের সারসংক্ষেপ

৪টা আলাদা উন্নতি Add Client form + Client Profile-এ করতে হবে:

### ১) Add Client form ঠিক করা (`AddClient.tsx`)

**সমস্যা:**
- "Billing শুরু মাস" এ date দেখাচ্ছে না, একটু পর পর reset হয়
- Expire date ঠিকমতো render হচ্ছে না
- Default expire day নাই

**সমাধান:**
- "Billing Start Month" — proper month picker (YYYY-MM) যা state-এ persist করবে
- "Expire Day" field — by default `10` set করা থাকবে (every client)
- Validation + display fix

### ২) "সংযোগ দিয়েছেন" (Installed By) — multi-technician

**বর্তমান:** single user dropdown
**পরিবর্তন:**
- Multi-select dropdown (technician/employee থেকে)
- যদি client converted হয় কোন `client_requests` থেকে — ওই request-এ assign করা technician-দের নাম auto-populate হবে
- Manual add client হলে field ফাঁকা থাকবে, user-ই select করবে
- DB: `clients.installed_by` text → `installed_by_ids uuid[]` (or jsonb array)

### ৩) Pro-rated first-month invoice logic

যখন নতুন client add হয় mid-month-এ (যেমন ১২ তারিখ):

```text
days_in_month = 30 (বা actual)
days_remaining = days_in_month - join_day + 1
prorated_bill = (monthly_package_price / days_in_month) × days_remaining
```

- শুধু **ওই মাসের** জন্য একটা invoice generate হবে → amount = prorated
- পরের মাস থেকে full monthly bill normal cycle-এ চলবে
- Billing list-এ এই prorated invoice দেখাবে remarks-সহ: "১২-৩০ এপ্রিল, ১৯ দিনের bill"
- Logic যাবে edge function-এ (`generate-monthly-billing`-এর pattern follow করে) অথবা client save trigger-এ

### ৪) Client Profile — "Generated & Updated Bill/Invoices" tab + edit

Reference image-125, image-126:

- ClientProfile.tsx-এ নতুন tab **"Generated & Updated Bill/Invoices"**
- Table: Date, Billing Month, Package, Speed, Bill Amount, Action (edit icon)
- Expandable row → ওই invoice-এর change history (system generated / edited by admin) দেখাবে
- Edit icon click → Dialog (image-126):
  - Package dropdown (current selected)
  - Bill Amount input
  - Remarks textarea
  - Submit → update billing row + insert audit row in `billing_history` table
- Permission: শুধু `billing.edit` role-এর user

### ৫) DB changes

**ALTER:**
- `clients` add: `installed_by_ids uuid[]`, `expire_day integer DEFAULT 10`, `billing_start_month text` (YYYY-MM)

**CREATE:**
- `billing_history` — `id, billing_id, action ('generated'|'edited'), old_value jsonb, new_value jsonb, changed_by, changed_at, remarks`

**RLS:** standard admin/branch-scoped policies।

## Files

**Edit:**
- `src/pages/dashboard/clients/AddClient.tsx` — billing month picker fix, expire day default 10, multi-tech selector, pro-rate calc on save
- `src/pages/dashboard/billing/ClientProfile.tsx` — new "Generated & Updated Bill/Invoices" tab with edit dialog
- `src/lib/bandwidthBilling.ts` — add `proRateFirstMonth()` helper
- `src/integrations/supabase/types.ts` (auto)

**Create:**
- `src/components/billing/BillEditDialog.tsx` — edit package/amount/remarks
- Migration: alter clients + create billing_history table + RLS
- `supabase/functions/generate-monthly-billing/index.ts` update — skip first month if prorated already exists

## ফলাফল

- নতুন client form-এ billing month/expire day stable থাকবে (default ১০)
- Mid-month join হলে শুধু সেই কয়দিনের bill auto-generate, পরের মাস থেকে normal monthly
- "সংযোগ দিয়েছেন" multiple technician select বা request থেকে auto-fill
- Profile থেকে যেকোনো মাসের invoice edit করা যাবে — full audit trail সহ

