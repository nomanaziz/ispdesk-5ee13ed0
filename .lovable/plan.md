

## লক্ষ্য

পাঁচটা কাজ:
1. সব "শীঘ্রই আসছে" feature (Excel/PDF export, Invoice download, SMS, Email, তারিখ বাড়ান, জেলা/থানা পরিবর্তন) তৈরি করা।
2. Billing list-এ **Regenerate Invoice** bulk button — selected client-দের চলতি মাসের bill missing থাকলে auto generate।
3. ClientList-এর **server column bug**: `MAIN-PPP-01` (stale data) এবং `-` (NULL) ঠিক করা — সব সময় mikrotik device-এর actual name দেখাবে।
4. AddClient form refinement: affiliator মুছে দেওয়া, "সংযোগ দিয়েছেন" employee dropdown, expire date 1-27/28/29/30 dropdown (last day বাদ), district/upazila zone থেকে by default + override dropdown, NID min 10 + mobile exactly 11 + MAC hex validation।
5. Stale `server_name` data fix (DB update)।

## পরিবর্তন

### A. Bulk action implementations (`BillingList.tsx` + `ClientList.tsx`)

- **Excel**: `xlsx` lib দিয়ে selected client export (নাম, কোড, মোবাইল, প্যাকেজ, মাসিক বিল, due, status etc)
- **PDF**: `jspdf` + `jspdf-autotable` দিয়ে list PDF
- **Invoice download**: selected client-দের চলতি মাসের bill PDF (existing PDF style follow)
- **SMS পাঠান**: `BulkSmsDialog` নতুন — template select + custom message → existing SMS gateway/edge function call
- **Email পাঠান**: `BulkEmailDialog` নতুন — subject + message → Lovable Cloud-এ একটা `send-bulk-email` edge function (Resend বা simple SMTP via existing setup)
- **তারিখ বাড়ান**: `BulkDateExtendDialog` — দিন সংখ্যা/নতুন expire_date input → `clients.expire_date` update
- **জেলা/থানা পরিবর্তন**: `BulkDistrictChangeDialog` + `BulkThanaChangeDialog` — districts/upazilas table থেকে dropdown → bulk update

### B. Regenerate Invoice button (`BillingList.tsx`)

- BulkActionButtons-এ নতুন `RefreshCw` button "ইনভয়েস পুনরায় তৈরি"
- Handler: selected client-দের চলতি মাসে bill check → না থাকলে `monthly_bill` দিয়ে নতুন `billing` row insert (same logic as `generate-monthly-billing` but per-client + force)

### C. Server column fix (ClientList + LeftClients + BillingList)

- Query-তে `mikrotik_device:mikrotik_devices(name)` join যোগ
- Display: `c.mikrotik_device?.name || c.server_name || "-"`
- **Stale data cleanup (insert/update tool)**: যেসব client-এর `mikrotik_id` আছে কিন্তু `server_name` mismatch বা NULL → mikrotik device name দিয়ে set করব
- **`fetch-mikrotik-ppp` (sync-online action)**-এও `server_name` auto-update যোগ — sync করলে DB-তে correct device name বসবে

### D. AddClient form refinement (`AddClient.tsx`)

1. **Affiliator field মুছে দেওয়া** (line 579-586) এবং `affiliator_id` payload থেকে remove
2. **"সংযোগ দিয়েছেন"** Input → Select dropdown — `employees` table থেকে active employees load করে dropdown
3. **Expire date**: `<Input type="date">` → একটা day-of-month Select (1 থেকে last_day-1)। যেহেতু month-অনুযায়ী dynamic, একটা helper: current/next month based + max day = lastDayOfMonth − 1। User শুধু day select করবে, পুরো date compute হবে।
4. **জেলা/উপজেলা**: zone select হলে auto-populate (zones.district_id → districts.name)। Manual override allow করতে `<Input>` → `<Select>` with all districts/upazilas list + "জোন থেকে নাও" option।
5. **Validation (Zod)**:
   - NID: min 10 digits, only digits
   - Mobile (`contact`): exactly 11 digits, starts with `01`
   - MAC (`device_serial` if device_type set): hex regex `^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$`
   - Validation error → toast + scroll to field

### E. Notes

- যোগদানের তারিখ ইতিমধ্যে আছে (`joining_date` field, default today) — user-এর company performance metric build-এর জন্য সেটা যথেষ্ট।
- Recharge Server API doc reference user দিয়েছে — তবে এই request-এ explicit RechargeServer কাজ uncovered; previous integration যা আছে সেটা থাকবে। Doc-specific changes পরের round-এ যদি বলা হয়।

## Files

**Edit:**
- `src/components/billing/BulkActionButtons.tsx` — add "Regenerate Invoice" button
- `src/pages/dashboard/billing/BillingList.tsx` — wire all real handlers + regenerate
- `src/pages/dashboard/clients/ClientList.tsx` — wire real handlers + server join
- `src/pages/dashboard/clients/LeftClients.tsx` — server display fix
- `src/pages/dashboard/clients/AddClient.tsx` — affiliator drop, employee dropdown, expire-day select, district/upazila override, validation
- `supabase/functions/fetch-mikrotik-ppp/index.ts` — server_name auto-update during sync

**নতুন (Dialogs):**
- `src/components/billing/BulkSmsDialog.tsx`
- `src/components/billing/BulkEmailDialog.tsx`
- `src/components/billing/BulkDateExtendDialog.tsx`
- `src/components/billing/BulkDistrictChangeDialog.tsx`
- `src/components/billing/BulkThanaChangeDialog.tsx`
- `src/lib/exportClients.ts` — Excel + PDF export helper
- `src/lib/clientValidation.ts` — Zod schemas

**নতুন Edge Function:**
- `supabase/functions/send-bulk-email/index.ts` (Resend/SMTP)

**Data update (insert tool):**
- `clients.server_name` যেখানে `mikrotik_id` আছে → corresponding mikrotik_devices.name

## ফলাফল

- কোনো button আর "শীঘ্রই আসছে" দেখাবে না
- Regenerate Invoice দিয়ে missing bill instantly create
- সব client-এর সঠিক server name দেখাবে (auto-sync হলে আপডেট থাকবে)
- AddClient form clean — affiliator নেই, employee থেকে installer select, expire day fixed range, district/upazila flexible
- Validation errors clear feedback দিবে

