

## লক্ষ্য

AddClient form থেকে calendar-based "মেয়াদ শেষের তারিখ" সরিয়ে দিন-ভিত্তিক **Expire Day (1-31)** dropdown বসানো। প্রতি মাসের সেই দিনে auto enforcement।

## পরিবর্তন

### 1. AddClient.tsx — Expire Date field replace
- বর্তমান `<Input type="date" value={form.expire_date}>` মুছে দাও
- **নতুন Select**: "মেয়াদ শেষের দিন" (1-31)
  - Label: "Expired Date (মাসের কোন দিন)"
  - Options: 1, 2, 3 ... 31
- Save করার সময় DB-তে `expire_date` actual full-date হিসাবে compute হবে (current/next month + selected day, clamp to last day if month-এ দিন কম)
- "সংযোগ দিয়েছেন" ইতিমধ্যে employee dropdown হয়ে আছে (আগের round-এ) — verify করব
- Affiliator logic আগেই removed — verify

### 2. ClientList.tsx — display tweak
- Expire date column: actual date এর সাথে ছোট badge দেখাবে "৫ তারিখ" (day extracted)

### 3. Auto Enforcement — already exists
- `supabase/functions/enforce-billing/index.ts` ইতিমধ্যে আছে — daily cron-এ run করে expired client disable করে MikroTik-এ
- Payment আসলে existing payment-callback flow-এ auto re-enable logic আছে কিনা check করব; না থাকলে `payment-callback/index.ts`-এ যোগ করব: payment success → `clients.mikrotik_status = 'enabled'` + MikroTik PPP secret enable

### 4. Helper utility
- `src/lib/clientValidation.ts`-এ `buildExpireDateFromDay(day)` ইতিমধ্যে আছে — reuse

## Files

**Edit:**
- `src/pages/dashboard/clients/AddClient.tsx` — calendar input → day Select (1-31)
- `src/pages/dashboard/clients/ClientList.tsx` — display day badge
- `supabase/functions/payment-callback/index.ts` — payment success-এ MikroTik auto enable (যদি না থাকে)

**Verify only:**
- `supabase/functions/enforce-billing/index.ts` — already runs daily and disables expired clients

## ফলাফল

- Form-এ আর calendar না, শুধু 1-31 dropdown
- প্রতি মাসের সেই দিনে bill due থাকলে auto disable + MikroTik বন্ধ
- Online payment আসলে auto active + MikroTik চালু

