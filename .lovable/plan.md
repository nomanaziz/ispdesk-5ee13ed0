

## লক্ষ্য
POP type অনুযায়ী sidebar toggles আলাদা দেখাতে হবে + postpaid POP-এর জন্য negative balance + auto-disable rule যোগ।

## ১. PopProfile sidebar toggles — type-aware

বর্তমানে সব toggle সব POP-এ দেখাচ্ছে। নতুন logic:

**Postpaid POP দেখাবে:**
- Client Create Permission
- Set Prefix in Mikrotik
- Fund Started, Is Locked (existing)
- ➕ **Allow Negative Balance** (নতুন)
- ➕ **Auto-disable Day of Month** (১–২৮; default 10) — এই দিনের মধ্যে পাওনা না দিলে line auto disable

**Prepaid POP দেখাবে:**
- Credit Refund Policy (already)
- Set Prefix in Mikrotik
- Fund Started, Is Locked
- ❌ Client Create Permission লুকানো (prepaid-এ অপ্রয়োজনীয় — balance থাকলেই create হবে)

## ২. Database changes (migration)

`branch_managers` table-এ ২টা column যোগ:
- `allow_negative_balance` boolean default false
- `auto_disable_day` smallint default 10 (১–২৮ check)

## ৩. PopForm-এ field যোগ

Postpaid select করলে এই দুটি field দেখাবে (prepaid-এ হাইড):
- "Negative Balance অনুমোদন" switch
- "Auto-disable তারিখ" number input (১–২৮)

## ৪. Balance enforcement logic

POP-এর fund deduct করার সময় (existing `FundDeductionDialog` + edge functions যেমন `enforce-billing`):
- যদি `allow_negative_balance = false` → balance < amount হলে block
- যদি `true` → negative হতে দিবে

`enforce-billing` edge function-এ check যোগ: postpaid POP-এর client-দের জন্য আজকের তারিখ ≥ `auto_disable_day` এবং balance < 0 হলে → MikroTik PPP secret disable + client status update।

## ৫. Files Changed

**Migration**: `branch_managers`-এ ২টা column

**Code**:
- ✏️ `src/pages/dashboard/branches/PopProfile.tsx` — sidebar toggles type-aware করা, নতুন fields-এর display
- ✏️ `src/components/branches/PopForm.tsx` — postpaid mode-এ ২টা field যোগ
- ✏️ `supabase/functions/enforce-billing/index.ts` — auto-disable day check যোগ (postpaid POPs)
- ✏️ `src/components/branches/FundDeductionDialog.tsx` — `allow_negative_balance` honor করা

## কী **হবে না**
- Prepaid POP-এ negative balance allow হবে না (intentional — advance recharge model)
- পুরাতন POP-এর behavior change হবে না — দুটো column-এর default safe values

