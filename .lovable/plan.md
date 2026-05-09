## সমস্যা

`enforce-billing` edge function প্রতি ঘণ্টায় চলে এবং নিচের ক্লায়েন্টগুলোকে ভুলভাবে disable করছে:
- যার `monthly_bill = 0` (free / complimentary line, যেমন `aftabnogor_office`)
- যার বর্তমান মাসের কোনো `billing` row নেই (বিল generate হয়নি)

কারণ: `disable_when_no_bill` setting default `true`, এবং `monthly_bill=0` কে কোনো filter বাদ দিচ্ছে না।

## ফিক্স প্ল্যান

### 1. `enforce-billing/index.ts` — logic শক্ত করা

candidate query ও skip-logic দুই জায়গায় পরিবর্তন:

- **Free line skip:** `monthly_bill IS NULL OR monthly_bill <= 0` হলে কখনো disable করা হবে না (skip reason: `skipped_free_line`).
- **No-bill default flip:** `disable_when_no_bill` যদি system setting-এ explicitly `true` না করা থাকে → **skip** (current default reverse করা)। যাদের সত্যিই disable করা দরকার, তাদের জন্য admin চাইলে toggle on করবে।
- **VIP** ও **paid/future-expire** আগের মতই skip থাকবে।

### 2. System Settings UI-তে toggle যোগ

`src/pages/dashboard/system/` — billing enforcement settings page-এ একটা switch:
- "যাদের বিল generate হয়নি তাদেরও disable করব" (default OFF)
- save করলে `system_settings.billing_enforcement.disable_when_no_bill` update হবে।

### 3. এখনই `aftabnogor_office`-কে enable করা

DB update: `clients.mikrotik_status = 'enabled'` + MikroTik router-এ PPP secret enable (manage-mikrotik-ppp call)।

### 4. (Optional) Audit log উন্নত করা

`billing_enforcement_runs.details`-এ skip reason-এ `skipped_free_line` যোগ যাতে future debug সহজ হয়।

## Technical notes

- File changes:
  - `supabase/functions/enforce-billing/index.ts` — candidate filter ও skip-loop update
  - `src/pages/dashboard/system/BillingEnforcementSettings.tsx` (যেটাই হোক relevant page) — toggle UI
- কোনো DB schema change লাগবে না, শুধু `system_settings` row-এর JSON value-তে নতুন key।
- Edge function auto-deploy হবে।
