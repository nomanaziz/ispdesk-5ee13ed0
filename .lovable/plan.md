

## Prepaid POP — Daily Auto-Recharge + Bulk/Single Recharge Button

### লক্ষ্য
Prepaid POP admin-এর জন্য complete recharge cycle implement করা: daily auto-deduction, R.Days display, "Bulk Client Recharge" button (শুধু prepaid POP-এ), single client recharge, এবং POP fund-শূন্য হলে MikroTik-এ user disable।

### Logic Flow

```text
Admin → POP-কে fund দেয়     (existing — branch_funding table)
POP fund_started = true     (existing — admin trigger)
   ↓
Client transfer হয়       → expire_date = NULL → R.Days dash
Client list-এ "নেওয়া হয়"   → expire_date = today (R.Days = 0)
Daily cron (00:01 Dhaka) → প্রত্যেক active client থেকে daily_rate কেটে
                          POP balance থেকে বাদ; expire_date < today
                          AND POP balance ≤ 0 হলে MikroTik disable
Recharge (bulk/single)   → POP balance ≥ daily×days হলে:
                            - balance থেকে কেটে
                            - expire_date += min_activation_days
                            - mikrotik_status = enabled (auto-on)
                            - pop_recharge_logs entry
```

### বর্তমান অবস্থা (verified)
- ✅ `pop_daily_charges` table, `apply-pop-daily-charges` edge function — আগে থেকেই আছে
- ✅ `RemainingDaysCell` component (BillingList-এ prepaid POP-এ দেখায়)
- ✅ `branch_managers.balance, fund_started, pop_type, tariff_id`
- ✅ `reseller_tariff_packages.min_activation_days, selling_rate, validity_days`
- ❌ Bulk Client Recharge button **নাই**
- ❌ Single client recharge button **নাই**
- ❌ Daily cron expire_date update + MikroTik disable on zero balance — incomplete
- ❌ Prepaid client transfer-এ expire_date initial value set হচ্ছে না → R.Days dash দেখাচ্ছে
- ❌ MikroTik manual enable block (recharge ছাড়া on করা যাবে না) — নাই

### Implementation — ৬টা step

#### Step 1 — Database migration
নতুন table: `pop_recharge_logs`
```
id, pop_id, branch_id, client_id, client_username, client_name,
package_id, package_name, days_added, amount_charged,
pop_balance_before, pop_balance_after,
recharge_type ('admin_bulk' | 'admin_single' | 'client_self' | 'auto_daily'),
recharged_by (uuid), payment_method, transaction_id,
expire_before date, expire_after date, created_at
```
RLS: POP-scoped read; service role insert.

#### Step 2 — `apply-pop-daily-charges` enhance
বর্তমানে শুধু balance থেকে deduct করে। নতুন logic যোগ:
- প্রত্যেক client-এর `expire_date` ১ দিন কমাও (যদি `expire_date >= today`)
- `expire_date < today` AND POP balance ≤ 0 → MikroTik PPP secret disable + `mikrotik_status='disabled'`
- POP balance ≤ 0 হলে নতুন charge **stop** (negative-এ যাবে না, যদি `allow_negative_balance=false`)
- Idempotent (একই দিন duplicate run safe — existing unique constraint)

#### Step 3 — Initial `expire_date` for prepaid clients
যখন POP admin "client list-এ নেয়" (transfer + activate)—portal-data-এর transfer/activate handler-এ:
- prepaid POP হলে → `expire_date = today` set করো (R.Days = 0 দেখাবে, recharge না হলে রাত ১২টার পর expire)
- এটা enforce করার জন্য `transfer_to_pop` handler patch + একটা one-time backfill SQL: `UPDATE clients SET expire_date = CURRENT_DATE WHERE owner_scope='pop' AND expire_date IS NULL AND branch_id IN (SELECT branch_id FROM branch_managers WHERE pop_type='prepaid')`

#### Step 4 — New edge function: `pop-recharge-clients`
Endpoint শুধু prepaid POP token-এর জন্য।
**Input:**
```ts
{ client_ids: string[], days?: number, payment_method?: string,
  transaction_id?: string, recharge_type: 'admin_bulk'|'admin_single' }
```
**Logic per client:**
1. Client load + tariff package খুঁজে → `min_activation_days`, `selling_rate`, `validity_days`
2. Days = `Math.max(days ?? min_activation_days, min_activation_days)` (নিচে যেতে দেবে না)
3. `daily_rate = selling_rate / validity_days` (বা monthly_bill/30 fallback)
4. `cost = daily_rate * days`
5. POP balance check: `balance >= cost` (না হলে error: "ফান্ডে পর্যাপ্ত টাকা নেই")
6. POP balance থেকে cost বাদ (atomic update)
7. `expire_date += days` (NULL হলে today + days)
8. `mikrotik_status = 'enabled'` + MikroTik API call (`manage-mikrotik-ppp` enable)
9. `pop_recharge_logs` insert
10. Return per-client result

Bulk: পুরো list iterate, partial success allowed, summary return।

#### Step 5 — UI: Bulk Recharge button + Single Recharge action
**`BulkActionButtons.tsx`** — নতুন optional prop `showBulkRecharge`, নতুন button "Bulk Client Recharge" (icon: `Banknote`/Icons8 `coins`, color: emerald)। শুধু `showBulkRecharge=true` হলে show।

**`BillingList.tsx`** — `isPrepaidPop` true হলে `showBulkRecharge` pass + new dialog `BulkRechargeDialog` open। Dialog-এ:
- Selected client list + প্রত্যেকের min_activation_days
- "দিন সংখ্যা" input (default = max of all min_activation_days)
- Cost summary: `সর্বমোট: ৳X / আপনার ব্যালেন্স: ৳Y`
- Confirm → `pop-recharge-clients` invoke
- Result toast + invalidate

**`ClientActionButtons.tsx`** (mode="billing") — prepaid POP হলে নতুন "Recharge" action যোগ → single client recharge dialog।

**Client portal** (existing client login) — Self-recharge button (bKash/Nagad payment gateway integration future scope; এই sprint-এ admin-only)। এই sprint-এ portal-এ শুধু "আপনার অ্যাকাউন্ট prepaid — admin-কে recharge-এর জন্য বলুন" notice।

#### Step 6 — MikroTik manual enable block
`manage-mikrotik-ppp` edge function-এ enable action handle করার সময়:
- Client যদি prepaid POP-এর হয় AND `expire_date < today` AND POP balance < daily_rate → enable **reject** with message: "Recharge ছাড়া এই ক্লায়েন্ট চালু করা যাবে না"
- Recharge endpoint থেকে enable call হলে bypass (`source: 'recharge'` flag pass)

### Files to Create/Modify

| Type | File | Change |
|---|---|---|
| Migration | new | `pop_recharge_logs` table + RLS + backfill expire_date |
| Edge fn | `supabase/functions/pop-recharge-clients/index.ts` | NEW — bulk/single recharge endpoint |
| Edge fn | `supabase/functions/apply-pop-daily-charges/index.ts` | expire_date decrement + auto-disable on zero balance |
| Edge fn | `supabase/functions/portal-data/index.ts` | `transfer_clients_to_pop` handler-এ initial expire_date=today (prepaid only) |
| Edge fn | `supabase/functions/manage-mikrotik-ppp/index.ts` | block manual enable for expired prepaid clients |
| Component | `src/components/billing/BulkActionButtons.tsx` | new `showBulkRecharge` prop + button |
| Component | `src/components/billing/BulkRechargeDialog.tsx` | NEW dialog |
| Component | `src/components/billing/SingleRechargeDialog.tsx` | NEW dialog |
| Component | `src/components/client-actions/ClientActionButtons.tsx` | prepaid Recharge action |
| Page | `src/pages/dashboard/billing/BillingList.tsx` | wire prepaid bulk recharge + show R.Days fix |

### Cron Schedule
`apply-pop-daily-charges` already deployed। Supabase scheduled trigger-এ যদি না থাকে → daily 00:01 Asia/Dhaka run register করতে হবে (pg_cron migration)।

### যা বদলাবে না
- Postpaid POP — কোনো button নাই, পুরনো flow বহাল
- Admin scope (non-POP) — affected নয়
- Existing billing/payment flow, monthly bill generation
- Lucide / Icons8 design system
- RBAC, multi-tenant scope

### Outcome
- Prepaid POP login → BillingList-এ "Bulk Client Recharge" button (top-right) + per-row "Recharge" action
- R.Days column-এ সঠিক দিন/Expired pill show হবে (dash আর না)
- POP fund দিয়ে recharge করলে MikroTik auto-enable + expire_date extend
- POP fund শূন্য হলে রাত ১২:০১-এ auto-disable, recharge ছাড়া on করা যাবে না
- প্রত্যেক recharge `pop_recharge_logs`-এ traceable

