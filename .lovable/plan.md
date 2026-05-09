# Reseller Balance Enforcement on MikroTik User Activation

## Problem

বর্তমানে reseller portal-এ MikroTik client enable/activate করলে reseller-এর `branch_managers.balance` থেকে কোনো টাকা কাটে না, এবং balance শূন্য/অপর্যাপ্ত হলেও activation আটকায় না। ফলে reseller (e.g. Naeema, code 0019, balance ৳10) যত খুশি ID active করতে পারছে।

প্রয়োজন: prepaid POP/reseller-এর জন্য activation-এর আগে balance check হবে; insufficient হলে block + "Recharge first" message + Fund/Recharge page-এ redirect; পর্যাপ্ত হলে package rate balance থেকে কেটে নেবে। `allow_negative_balance = true` হলে এই rule বাইপাস হবে।

## Scope of changes

### 1. Database (migration + trigger)

- নতুন SECURITY DEFINER function `public.charge_pop_for_client_activation(_client_id uuid)`:
  - Client-এর `branch_id` থেকে `branch_managers` row লোড।
  - `pop_type='prepaid'` না হলে কিছু না করে রিটার্ন (postpaid POP exempt)।
  - `allow_negative_balance = true` হলে deduction skip (admin negative credit দিয়েছে)।
  - Charge amount = `pop_package_pricing.pop_selling_rate` (POP-specific) → fallback `reseller_tariff_packages.selling_rate` → fallback `clients.monthly_bill`।
  - Insufficient (`balance < amount` এবং `allow_negative_balance = false`) → `RAISE EXCEPTION 'INSUFFICIENT_BALANCE: ...'`।
  - Sufficient → `branch_managers.balance -= amount` এবং `branch_funding`-এ একটা `trans_type='charge'` (negative-effect) row insert করে audit trail (যাতে FundingHistory-তে দেখা যায়)। Alternative: নতুন `pop_balance_ledger` table — but reuse `branch_funding` simpler।

- নতুন trigger `trg_charge_pop_on_client_activation` on `public.clients`:
  - **AFTER INSERT** যখন `NEW.status='active'` এবং `owner_scope='pop'`।
  - **AFTER UPDATE** যখন `OLD.status` non-active → `NEW.status='active'`।
  - উপরের function কল করবে।

- নতুন trigger `trg_charge_pop_on_mt_enable` on `public.mikrotik_clients`:
  - **BEFORE UPDATE** যখন `OLD.status='disabled'` → `NEW.status='active'` (বা যেকোনো non-disabled)।
  - যদি `linked_client_id` থাকে, function কল; insufficient হলে exception → enable আটকে যায়।

- Refund logic (optional, এই plan-এর scope-এ): client `disabled` হলে কিছু refund না (admin চাইলে পরে)।

### 2. Frontend — `src/pages/reseller/ResellerMikrotikUsers.tsx`

- `toggleStatus.mutationFn` (line 61-66) এবং `createClient.mutationFn` (line 88-122)-এ try/catch:
  - DB error message-এ `INSUFFICIENT_BALANCE` থাকলে:
    - `toast.error("পর্যাপ্ত balance নেই — আগে recharge করুন")`
    - `navigate('/pop-admin/funding-history')` (বা যে recharge page exist করে — confirm needed; আপাতত FundingHistory)।
  - অন্য error হলে existing toast।

- `ResellerDashboard`-এ একটা ছোট banner: balance < ১ মাসের estimated bill হলে "Low balance — recharge soon" warning।

### 3. Edge function (none needed)

DB trigger-ই enforcement; frontend-এ শুধু error → redirect handling।

## Technical details

```text
clients.INSERT(status=active, owner_scope=pop)
        │
        ▼
trg_charge_pop_on_client_activation
        │
        ▼
charge_pop_for_client_activation(client_id)
   ├── load branch_managers (pop_type, balance, allow_negative_balance)
   ├── if pop_type != 'prepaid' OR allow_negative_balance → return
   ├── resolve charge = pop_package_pricing.pop_selling_rate
   ├── if balance < charge → RAISE 'INSUFFICIENT_BALANCE'
   └── balance -= charge ; insert audit row in branch_funding
```

- Audit row in `branch_funding`: `trans_type='charge'`, `amount = -charge`, `note='Client activation: <username>'`, `branch_id=<pop branch>`. Existing `apply_branch_funding_to_balance` trigger uses `+amount` for fund and `-amount` for refund — for `charge` we'll set `trans_type='refund'` semantically OR add new branch in trigger. Cleaner: do the balance UPDATE directly inside `charge_pop_for_client_activation` and only insert ledger row WITHOUT triggering the funding-balance trigger. We'll use a new dedicated table `pop_balance_ledger(id, branch_id, client_id, amount, reason, created_at)` to avoid coupling — simpler and clearer.

- New `pop_balance_ledger` columns: `amount` (negative for charge), `reason text`, indexed on `branch_id, created_at`.

## Out of scope (confirm if needed)

- Postpaid POP billing cycle changes
- Auto-disable on insufficient balance for already-active clients (monthly recurring deduction) — current plan only deducts at activation moment, not recurring monthly.
- Refund on deactivation (separate from existing `process_credit_refund_on_client_left`).

## Files touched

- `supabase/migrations/<new>.sql` — function + 2 triggers + ledger table + RLS
- `src/pages/reseller/ResellerMikrotikUsers.tsx` — error handling + redirect
- `src/pages/reseller/ResellerDashboard.tsx` — low-balance banner (small addition)

## Open question

Recharge page route-টা `/pop-admin/funding-history` ব্যবহার করব, না আলাদা "Recharge Request" page আছে? Confirm করলে redirect target ঠিক করব।
