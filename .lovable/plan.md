## সমস্যা

POP/Reseller এর R.Days recharge করার সময় daily rate ভুল হচ্ছে। উদাহরণ: 5 MB Basic package, Admin → POP buy price ৳240, min_activation_days = 30 → daily হওয়া উচিত ৳8.00।

দুই জায়গায় ভুল:

### 1. `BulkClientRechargeDialog.tsx` (UI preview)
লাইন 35:
```ts
const daily = Math.round((monthly / 30) * 100) / 100;
```
এখানে `monthly` = `client.monthly_bill` — এটা **end-customer selling rate** (POP যে দামে client কে বিক্রি করে), POP-এর buying rate **নয়**। ফলে preview-এ POP-এর selling rate দিয়ে ভাগ হচ্ছে।

### 2. `pop_resolve_client_package_cost` RPC (server)
```sql
SELECT COALESCE(rtp.selling_rate, 0), COALESCE(NULLIF(rtp.validity_days, 0), 30)
  INTO v_buy, v_days
  FROM public.reseller_tariff_packages rtp ...
```
- `rtp.selling_rate` (Admin → POP rate) **সঠিক** — এটাই POP-এর buy_rate।
- কিন্তু divisor হিসেবে `validity_days` ব্যবহার হচ্ছে, আপনি বললেন `min_activation_days` দিয়ে ভাগ হবে।

## ঠিক করার প্ল্যান

### A. Server RPC (`pop_resolve_client_package_cost`)
Migration দিয়ে ফাংশনটি update করব — `validity_days`-এর জায়গায় `min_activation_days` ব্যবহার:
```sql
SELECT COALESCE(rtp.selling_rate, 0),
       COALESCE(NULLIF(rtp.min_activation_days, 0), 30)
  INTO v_buy, v_days ...
```
ফলে `pop_recharge_client_days`, `pop_auto_renew_client`, `pop_bulk_recharge_clients` সবাই স্বয়ংক্রিয়ভাবে সঠিক daily rate দিয়ে হিসাব করবে: `daily = buy_rate / min_activation_days`।

> Auto-renew: `pop_auto_renew_client` এক পূর্ণ cycle renew করে — এটা `min_activation_days` দিন recharge করবে (পূর্বে validity_days ছিল)। এটাই logically সঠিক — POP প্রতিবার minimum cycle এর জন্য charge হবে।

### B. New portal action: `get_clients_recharge_cost`
`portal-data` edge function-এ নতুন একটা case যোগ করব যেটা client_ids array নিয়ে প্রতিটির জন্য `{client_id, buy_rate, min_activation_days, daily_rate}` ফেরত দেবে (RPC `pop_resolve_client_package_cost` কে loop-এ ডেকে)।

### C. `BulkClientRechargeDialog.tsx`
- Dialog খোলার সময় `get_clients_recharge_cost` call করে প্রতিটা client-এর সঠিক daily_rate আনব।
- Preview-এ `monthly_bill / 30` সরিয়ে server থেকে আসা `daily_rate` ব্যবহার করব।
- যেসব client-এর rate resolve হয়নি (NO_RATE) তাদের আলাদা warning দেখাব এবং `client_ids` থেকে বাদ দেব।

### D. (ছোট ঐচ্ছিক) `RemainingDaysCell`
এটি save-এ server-RPC ডাকে, তাই auto-fix। শুধু helper text-এ "প্রতি দিন ৳X কাটা হবে" দেখাতে চাইলে একই `get_clients_recharge_cost` দিয়ে preview দেখানো যাবে — চাইলে এই step skip করা যায়। (আপনার confirm করলে যোগ করব।)

## ফাইল

| ফাইল | পরিবর্তন |
|---|---|
| migration (নতুন) | `pop_resolve_client_package_cost`: `validity_days` → `min_activation_days` |
| `supabase/functions/portal-data/index.ts` | নতুন case `get_clients_recharge_cost` |
| `src/components/reseller/BulkClientRechargeDialog.tsx` | server-resolved daily rate ব্যবহার, NO_RATE clients exclude |

কোন DB schema বদল নেই, কোন data migration নেই।

## যাচাই

- Dialog-এ একটা 5 MB client (buy ৳240, min_activation 30) select করে 1 day → daily ৳8.00, total ৳8.00 দেখাবে।
- 30 days → ৳240।
- Auto-renew cron একটা পূর্ণ `min_activation_days` cycle এ recharge করবে।

Approve করলে migration লিখব, তারপর code edits করব।