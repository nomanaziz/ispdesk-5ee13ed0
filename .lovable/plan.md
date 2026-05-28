# Billing Mode সেটআপ — Monthly / Date-to-Date / Hybrid

## লক্ষ্য
System-wide তিনটি billing mode support করা:
1. **Monthly (month-to-month)** — সব client প্রতি মাসের একটি নির্দিষ্ট তারিখে (যেমন ১ তারিখে) bill পাবে; expiry সেই মাসের শেষে।
2. **Date-to-Date** — যে তারিখে line চালু, পরের মাসের সেই তারিখেই expire; expiry-র একদিন আগে bill auto-generate, pay না হলে next day inactive।
3. **Hybrid** — দুটোই enabled; প্রতিটি client-এ আলাদা mode select করা যাবে। শুধু hybrid mode-এ client form/edit page-এ "Billing Policy" option দেখাবে। Monthly বা Date-to-Date selected থাকলে option লুকানো (force-applied)।

## পরিবর্তনের scope

### 1. System settings (পিরিয়ড সেটআপ পেজ)
`src/pages/dashboard/system/Periods.tsx` এবং `billing_periods` setting-এ `billing_mode` এর তিনটি option:
- `monthly`
- `date_to_date`
- `hybrid`

প্রতিটির পাশে একটি ছোট ব্যাখ্যা — কোনটা select করলে কী হবে। Hybrid select করলে একটি info box: "প্রতিটি client-এ আলাদা policy বেছে নিতে হবে।"

### 2. Clients table-এ per-client mode
নতুন column: `clients.billing_policy` (`text`, nullable, values: `monthly` | `date_to_date`)।
- Hybrid mode-এ এই column-এর value কাজ করবে। null হলে default `monthly`।
- Non-hybrid mode-এ system setting-ই উৎস; per-client value ignore।

### 3. Add/Edit Client UI
`AddClient.tsx` (এবং edit flow)-এ একটি "Billing Policy" select field যোগ করা হবে যা **শুধু তখনই render হবে** যখন system `billing_mode === 'hybrid'`। দুটো option: Monthly / Date-to-Date। সেটি `billing_policy` column-এ save হবে।

### 4. Effective policy resolver (নতুন helper)
`src/lib/billingPolicy.ts`:
```ts
resolveClientBillingPolicy(systemMode, client): 'monthly' | 'date_to_date'
```
- system `monthly` → সর্বদা monthly
- system `date_to_date` → সর্বদা date_to_date
- system `hybrid` → `client.billing_policy ?? 'monthly'`

সব billing-related code (bill generation, expiry calc, UI badge) এই একটি helper ব্যবহার করবে।

### 5. Billing engines update
- **Monthly path** (existing `generate-monthly-billing` edge function) — শুধু সেই client-দের process করবে যাদের effective policy `monthly`।
- **Date-to-Date path** (নতুন edge function `generate-date-to-date-billing` অথবা existing enforce-billing-এ extend) — প্রতিদিন run হয়ে চেক করবে: যেসব client-এর `expire_date` আগামীকাল, তাদের জন্য আজ ১ মাসের নতুন bill issue করবে; `expire_date` পেরিয়ে গেলে এবং unpaid থাকলে status → inactive।
- Existing daily cron / enforce-billing-এ branching: effective policy অনুযায়ী কোন logic চলবে তা ঠিক হবে।

### 6. Client list / detail UI
"Exp Date" column-এর পাশে policy badge (M / D2D) — শুধু hybrid mode-এ visible, যাতে operator চিনতে পারে কে কোন policy-তে আছে।

## এই plan-এ যা **নেই**
- BW Sale / BW Buy এর internal pro-rate logic অপরিবর্তিত (ওগুলো subscription-segment ভিত্তিক, পৃথক)।
- Suspend/disable cron-এর core logic পরিবর্তন হচ্ছে না — শুধু policy-aware branch যোগ হচ্ছে।
- বিদ্যমান client-দের data migration প্রয়োজন নেই; null → monthly default।

## Technical notes (non-blocking)
- Migration: `ALTER TABLE public.clients ADD COLUMN billing_policy text CHECK (billing_policy IN ('monthly','date_to_date')) NULL;`
- `Periods.tsx` config schema-তে `billing_mode` enum update + hybrid option।
- কোনো existing screen-এ visible change নেই যতক্ষণ না admin hybrid select করেন।

## যাচাই
1. System mode = monthly → AddClient-এ policy field দেখাবে না; সব client monthly billing।
2. System mode = date_to_date → field দেখাবে না; সব client D2D।
3. System mode = hybrid → field দেখাবে; একজন client-কে D2D, আরেকজনকে monthly করে confirm করতে হবে যে দুই engine দুটোকে আলাদাভাবে process করছে।

Approve করলে migration + code changes একসাথে apply করা হবে।