

## লক্ষ্য
POP-এর `fund_started = false` হলে balance check **skip** করব। তখন creditable amount calculate হবে কিন্তু balance থেকে কাটা হবে না, এবং unlimited transfer-এ allow করব।

## Logic

```text
fund_started = TRUE  → বর্তমান logic (balance check + debit)
fund_started = FALSE → free mode:
                       - balance check skip
                       - Export blocked warning দেখাবে না
                       - balance debit (branch_funding insert) skip
                       - Creditable amount শুধু info হিসেবে দেখাবে (grey badge: "Free mode")
```

## পরিবর্তন (শুধু `src/components/mikrotik/TransferToPopDialog.tsx`)

### 1. POP query (line 38)
- `select`-এ `fund_started` যোগ:
  `"id, name, pop_code, branch_id, tariff_id, pop_type, balance, status, fund_started"`

### 2. Mutation balance check (lines 81-83)
- Condition update:
  `if (selectedPop.pop_type === "prepaid" && selectedPop.fund_started && Number(selectedPop.balance || 0) < creditable)`

### 3. Balance debit insert (lines 138-153)
- `branch_funding` insert wrap:
  `if (creditable > 0 && selectedPop.fund_started) { ... }`
- যাতে fund start না থাকলে কোনো deduction record না হয়

### 4. UI warning (lines 266-270)
- Condition-এ `selectedPop.fund_started` যোগ:
  `selectedPop?.pop_type === "prepaid" && selectedPop?.fund_started && creditable > Number(...)`

### 5. Export button disabled (lines 277-278)
- একই condition update

### 6. Free mode badge (creditable section-এর নিচে নতুন)
- যদি `selectedPop && !selectedPop.fund_started`:
  > 🟢 Free mode — এই POP-এর fund start নেই, balance check হবে না। Unlimited transfer allowed।

### 7. Success toast (line 158)
- Fund off হলে toast message:
  `${createdCount} client তৈরি — Free mode (balance unchanged)`

## যা **বদলাবে না**
- Existing prepaid+fund_started POP-এর behavior intact
- কোনো DB schema, migration, RLS, edge function — কিছুই touch হবে না
- `Import.tsx`, package selection logic — intact

approve করলে এই একটি file-এ ৭টি সংলগ্ন change apply করব।

