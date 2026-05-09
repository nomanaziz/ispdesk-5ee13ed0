
# Reseller Client Recharge & R.Days Logic

## Concept (one line)
Reseller এর portal-এ client active রাখার balance — প্রতি client এর `expire_date` থেকে R.Days হিসেব হয়। Recharge করলে POP balance থেকে অগ্রিম টাকা কেটে expire বাড়ে; R.Days = 0 হলে client suspend, যদি না reseller "Auto Recharge" on রাখে।

## Behaviour

### 1. Per-client recharge (1 day বা N days)
- Reseller একটা client কে N দিনের জন্য recharge করে।
- Per day charge = `monthly_bill / 30` (round to 2 decimals)।
- Total cost = `N × per_day`।
- POP balance থেকে cost তখনই debit হয়। Balance না থাকলে → `INSUFFICIENT_BALANCE` (UI recharge page-এ পাঠাবে)।
- Client এর `expire_date` = `max(today, expire_date) + N`।
- `pop_daily_charges` table-এ N টা row insert হবে (charge_date = day-1, day-2, … day-N) — তাই history-তে দিনে দিনে কাটার breakdown দেখা যাবে। 30 দিন recharge করলে আজ থেকে পরের তারিখ পর্যন্ত প্রতিদিনের row থাকবে।

### 2. Auto Recharge (reseller setting)
- Reseller Settings-এ একটা toggle: **Auto Recharge**।
- Daily cron রাত ১২:৩০-এ চলবে। প্রত্যেক reseller-এর জন্য:
  - Setting off → কিছু করবে না।
  - Setting on, POP `fund_started=true`:
    - যেসব client এর `expire_date < today` AND `mikrotik_status = enabled` (অর্থাৎ reseller manually disable করে রাখেনি) → প্রতিটাকে ১ দিন recharge করার চেষ্টা।
    - POP balance যথেষ্ট হলে → ১ দিন debit + expire_date = today। না হলে skip (suspend stays)।
- Reseller MikroTik status `disabled` করে রাখলে auto recharge হবে না — MikroTik status switch dominant।
- যেসব client আগেই অগ্রিম 30 দিনের recharge করা আছে (R.Days > 0), auto recharge তাদের touch করবে না।

### 3. Bulk Client Recharge (header button)
- Billing Clients page-এর উপরে **Bulk Client Recharge** button (screenshot-এর মত)।
- Dialog: package filter, "New Renewal Days" input (1–365), per-day rate (read-only), creditable amount per client, selected count, total creditable amount, **Recharge/Renew** button।
- "Days limit exceed" warning দেখাবে যদি `total > pop.balance`।
- "Bulk Recharge for Zero/Expired only" filter — শুধু R.Days ≤ 0 client নেবে।

### 4. R.Days inline edit
- Existing `RemainingDaysCell` popover এখন expire_date সরাসরি update করে — এটা recharge RPC-তে route হবে যাতে balance debit হয়।

## Technical Plan

### DB migration
- `branch_managers` → `auto_recharge_enabled boolean default false`।
- RPC `pop_recharge_client_days(p_client_id uuid, p_days int)`:
  - SECURITY DEFINER, search_path=public।
  - Lock POP row, compute cost, balance check (skip if `allow_negative_balance`)।
  - Insert N rows in `pop_daily_charges` (one per future day, idempotent on `pop_id+client_id+charge_date`)।
  - Update `branch_managers.balance` and `clients.expire_date`।
- RPC `pop_bulk_recharge_clients(p_client_ids uuid[], p_days int)` → loops above; returns `{succeeded, failed, total_charged}`।
- Existing `charge_pop_for_client_activation` থাকবে (initial activation), but daily debit এখন pre-charge model।
- Existing `apply-pop-daily-charges` cron retire — এখন per-recharge debit আগেই হয়ে গেছে; নতুন cron `reseller-auto-recharge` প্রতিদিন ১২:৩০-এ।

### Edge functions
- New `reseller-auto-recharge/index.ts` — cron consumer; iterates resellers with `auto_recharge_enabled=true`, calls bulk RPC for due clients।
- Old `apply-pop-daily-charges` কে disable/keep as no-op।

### Frontend
- **`ResellerSettings.tsx`** → Auto Recharge switch।
- **`PopBillingClient.tsx`** → rebuild as client list with: select-all, MikroTik status switch column, R.Days pill, Recharge action; header button "Bulk Client Recharge"।
- **`BulkClientRechargeDialog.tsx`** (new) — screenshot এর mirror।
- **`RemainingDaysCell.tsx`** → reseller mode-এ `pop_recharge_client_days` RPC কল করবে; balance fail হলে toast + redirect।
- **`PopFundDebitHistory.tsx`** — already shows `pop_daily_charges`, per-client filter add।

### Out of scope
- Admin-side prepaid/postpaid cron (already neutralised)।
- 30-day recharge "lock" আলাদা flag লাগে না — `expire_date > today` থাকলেই auto-recharge skip হয়।
- `pop_type` column cleanup — পরে আলাদা migration।

## Files
- New: migration, `reseller-auto-recharge` edge function, `BulkClientRechargeDialog.tsx`।
- Edited: `PopBillingClient.tsx`, `ResellerSettings.tsx`, `RemainingDaysCell.tsx`, types regen।

## Open questions
উপরের logic ঠিক আছে কি না কনফার্ম করুন; বিশেষ করে:
1. Auto recharge শুধু expired (R.Days ≤ 0) client-এর জন্য, নাকি R.Days = 0 হওয়ার আগে দিনই pre-renew করবে?
2. Per-day charge calculation `monthly_bill / 30` ঠিক আছে, নাকি package-এ আলাদা daily rate রাখব?
