## লক্ষ্য

POP → Client recharge এর সঠিক হিসাব:

- **Daily rate** = `package_buy_price / validity_days` (validity দিয়ে ভাগ, min_activation দিয়ে নয়)
- **Total charge** = `daily_rate × days` (calendar মাস irrelevant)
- **Minimum recharge** = `min_activation_days` — এর কম দিন দিলে block

উদাহরণ: Basic, buy ৳250, validity 30, min_activation 10 → daily ৳8.33; ১০ দিনের কম recharge করা যাবে না; ৩০ দিন = ৳250।

## ফাইল পরিবর্তন

### 1. New migration — `pop_resolve_client_package_cost` revert + extend

| Field | Value |
|---|---|
| `buy_price` | `rtp.selling_rate` (Admin → POP rate) |
| `validity_days` | `COALESCE(NULLIF(rtp.validity_days,0), 30)` ← **revert from min_activation_days** |
| `min_activation_days` (new) | `COALESCE(NULLIF(rtp.min_activation_days,0), 1)` |

Return type becomes `TABLE(buy_price numeric, validity_days int, min_activation_days int)`।

### 2. Same migration — `pop_recharge_client_days`

- `SELECT buy_price, validity_days, min_activation_days INTO v_buy, v_days, v_min`
- Add check: `IF p_days < v_min THEN RAISE EXCEPTION 'MIN_DAYS: এই package এ minimum % দিন recharge করতে হবে', v_min;`
- `v_daily := round(v_buy / v_days, 2)` — অপরিবর্তিত
- Return JSON এ `min_activation_days` যোগ

### 3. Same migration — `pop_auto_renew_client`

- Renew for full `validity_days` (অপরিবর্তিত), শুধু signature update

### 4. `supabase/functions/portal-data/index.ts` — `get_clients_recharge_cost`

প্রতি client এর জন্য return:
```
{ client_id, buy_rate, validity_days, min_activation_days, daily_rate }
```
যেখানে `daily_rate = buy_rate / validity_days`।

### 5. `src/components/reseller/BulkClientRechargeDialog.tsx`

- `costMap` এ `min_activation_days` track করব
- Selected clients এর মধ্যে সর্বোচ্চ `min_activation_days` = `effectiveMin`
- Days input এর `min={effectiveMin}`, default value `effectiveMin`
- যদি user `< effectiveMin` দেয় → red warning "Minimum X days required" এবং Submit disable
- Per-client `daily × days` total — অপরিবর্তিত
- Submit এর সময় শুধু `validIds` (rate resolved) পাঠাবে; server-side MIN_DAYS error এলে toast এ দেখাবে

### 6. `src/components/reseller/RemainingDaysCell.tsx` (single-client R.Days save)

- Save এর আগে server থেকে `min_activation_days` নিয়ে input validate করব (যদি `<min` হলে toast error, save block)

## প্রভাবিত নয়

- `bandwidthBilling.ts` (BW Buy/BW Sale prorate) — অপরিবর্তিত, এটা bandwidth বিক্রয়ের জন্য, package recharge নয়
- DB schema — কোনো পরিবর্তন নেই (column গুলো আগে থেকেই আছে)
- Client-facing monthly billing (`generate-monthly-billing`) — এই hisab POP→Client recharge, end-customer billing নয়

## যাচাই

- Buy ৳250, validity 30, min 10 → daily ৳8.33, 30 days = ৳250 ✓
- 5 days দিলে → MIN_DAYS error ("minimum 10 days") ✓
- Bulk dialog এ একাধিক client (min 10 / min 30 mix) → input min = 30 ✓
- Auto-renew cron → 30 দিন cycle, charge ৳250 ✓

Approve করলে migration লিখে কোড edits করব।
