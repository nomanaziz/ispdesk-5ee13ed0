# Capital, Funding Sources ও Cash-on-Hand Guard — Accounting Module Plan

## সমস্যা ও লক্ষ্য

বর্তমানে Cash Book এ `Cash on Hand = Debit Total − Credit Total` মাইনাস হয়ে যাচ্ছে। বাস্তবে — income না থাকলে expense সম্ভব না; টাকা কোথাও না কোথাও থেকে আসতে হবে (মালিক, ব্যাংক, বিনিয়োগকারী ইত্যাদি)। তাই দরকার:

১. একটা পূর্ণাঙ্গ **Capital / Funding Source** module।
২. প্রতিটি funding source এর জন্য — fund add, withdrawal, interest/installment, fine track।
৩. সকল expense, withdraw, salary, purchase, vendor pay submit করার আগে **Cash on Hand ≥ 0** check। কম হলে save block → "আগে fund add করুন" toast।
৪. Cash Book এ funding সব visible debit side এ; withdrawal/installment credit side এ।

---

## ১. Funding Source Types

বাজারে ISP/SMB বাস্তবতায় common ৬ ধরনের capital ধরছি:

| Type | বিবরণ | Interest | Repayment |
|---|---|---|---|
| `owner_capital` | মালিকের নিজের জমা টাকা | না | optional drawing |
| `partner_capital` | অংশীদারের জমা | না | profit share / drawing |
| `investor` | তৃতীয়পক্ষ বিনিয়োগকারী | optional % | মাসিক / এককালীন, profit share বা fixed |
| `bank_loan` | ব্যাংক ঋণ | আছে (%) | মাসিক installment, late fine |
| `private_loan` | ব্যক্তিগত ধার | optional | flexible |
| `other_income` | অন্য ব্যবসা থেকে transfer | না | না |

প্রতি source এর জন্য একটা **contributor profile** (নাম, ফোন, ঠিকানা, NID/Trade License, opening date, agreed terms)।

---

## ২. ডাটাবেস ডিজাইন

### `capital_contributors`
- type (enum উপরের ৬টা)
- name, phone, address, identifier (NID/account)
- agreed_amount, currency (default BDT)
- interest_rate_pct (nullable), interest_type (`flat`/`reducing`/`profit_share`/`none`)
- installment_amount, installment_cycle (`monthly`/`quarterly`/`yearly`/`one_time`/`flexible`)
- start_date, end_date, status (`active`/`closed`)
- branch_id, notes

### `capital_transactions`
সবধরনের contributor-related টাকার movement একই table এ:
- contributor_id
- direction (`in` = fund add → cash বাড়ে / `out` = withdraw বা installment → cash কমে)
- category (`principal_in`, `principal_repay`, `interest_pay`, `profit_share`, `late_fine`, `drawing`, `other`)
- amount, transaction_date, payment_method
- reference, description, branch_id, created_by
- linked_account_id (chart_of_accounts এ map)

### `capital_installment_schedule` (শুধু loan/scheduled investor এর জন্য)
- contributor_id, due_date, principal_due, interest_due, total_due, paid_amount, status (`pending`/`partial`/`paid`/`overdue`), fine_amount

> Auto-generate: contributor save করলে cycle অনুযায়ী schedule rows তৈরি হবে। due_date পার হলে `overdue` ও fine rule অনুযায়ী fine যোগ।

### Chart of Accounts auto-seed
নতুন accounts যুক্ত হবে (যদি না থাকে):
- `3000 Owner Capital` (Equity)
- `3100 Partner Capital` (Equity)
- `3200 Investor Capital` (Equity/Liability)
- `2100 Bank Loan` (Liability)
- `2200 Private Loan` (Liability)
- `5100 Interest Expense` (Expense)
- `5110 Late Payment Fine` (Expense)
- `3900 Owner Drawings` (Equity-contra)

প্রত্যেক contributor save এ ledger account auto-link হবে।

---

## ৩. Cash-on-Hand Guard (Core Rule)

নতুন SQL function **`get_cash_on_hand(_branch_id uuid, _as_of date)`** —
Debit (যোগ): bill_collections + installation_fees.paid + service/product/bw_sales paid_amount + income_entries + **capital_transactions(direction=in)** + branch_funding(type=in)
Credit (বিয়োগ): payroll paid + expense_entries + bw_purchase paid + purchase_bills paid + **capital_transactions(direction=out)**

নতুন BEFORE-INSERT trigger function **`enforce_cash_on_hand()`** এই tables এ attach হবে:
- `expense_entries`
- `payroll` (status='paid' update এ)
- `bw_purchase_bills`, `purchase_bills` (paid amount বাড়ালে)
- `bill_collections` কে exclude (এটা income)
- `capital_transactions` যেখানে direction='out'

Logic: insert/update এর পর projected `cash_on_hand` calculate করবে; যদি `< 0` তাহলে `RAISE EXCEPTION 'Insufficient cash on hand. Please add fund first.'`। Frontend এই error catch করে Bangla toast দেখাবে।

> Exception: Super Admin override করতে পারবে `app_settings.allow_negative_cash=true` দিয়ে (default false)। UI তে override checkbox + reason বাধ্যতামূলক।

---

## ৪. নতুন UI পেজ

Accounting menu এ নতুন গ্রুপ — "মূলধন ও বিনিয়োগ":

1. **`/dashboard/accounting/capital/contributors`** — contributor list/add/edit। Type filter, agreed vs current outstanding, next due।
2. **`/dashboard/accounting/capital/transactions`** — সকল fund-in/out লেনদেন, filter by contributor/type/date।
3. **`/dashboard/accounting/capital/schedule`** — loan/investor installment calendar; due/overdue badge, "পরিশোধ" button → capital_transactions(out, interest+principal split) তৈরি।
4. **`/dashboard/accounting/capital/dashboard`** — summary cards:
   - Total Capital Received (by type breakdown pie)
   - Outstanding Liability (loans + investor principal due)
   - Interest Paid YTD
   - Upcoming Installments (next 30 days)
   - Cash on Hand (live)

### বিদ্যমান পেজ আপডেট
- **CashBook.tsx**: debit side এ "Owner/Partner Capital In", "Investor In", "Loan Disbursed", "Other Income"; credit side এ "Owner Drawing", "Investor Withdraw", "Loan Installment (Principal)", "Interest Paid", "Late Fine"। Cash on Hand row কে `Math.max(0, …)` নয় — actual দেখাবে কিন্তু negative হলে red highlight + "⚠ আগে fund add করুন" banner।
- **Expense.tsx / Income.tsx / Payroll / Purchase pay dialog**: submit এ trigger error catch করে user-friendly Bangla message + শর্টকাট "এখন fund add করুন" link।
- **AccountingDashboard.tsx**: Cash on Hand widget + funding breakdown widget যোগ।

---

## ৫. Permission ও Routing

- নতুন `ACCOUNTING > Capital Contributors`, `Capital Transactions`, `Capital Schedule`, `Capital Dashboard` permission modules।
- Super Admin/Admin কে full access auto-grant। অন্যান্য role default `none`।
- Menu items `menuItemModuleMap.ts` ও `AppSidebar.tsx` এ map।

---

## ৬. Installment ও Fine Automation

- দৈনিক pg_cron job `update_capital_installments_daily()`:
  - past-due unpaid rows → status `overdue`
  - contributor এর `late_fine_rule` (json: `{type: 'fixed'|'percent', value, grace_days}`) অনুযায়ী fine calc।
- Schedule page এ "পরিশোধ" → modal: principal, interest auto-split (reducing balance হলে remaining principal × rate/12), fine, payment_method → একসাথে capital_transactions(out) ও expense_entries (interest, fine) তৈরি, schedule row update।

---

## Technical Section

**Migration order:**
1. `chart_of_accounts` seed (idempotent INSERT … WHERE NOT EXISTS)
2. CREATE `capital_contributors`, `capital_transactions`, `capital_installment_schedule` + GRANT + RLS (admin write, all auth read)
3. CREATE `app_settings` (singleton or key-value) যদি না থাকে; key `allow_negative_cash`
4. CREATE function `get_cash_on_hand(branch, as_of)` SECURITY DEFINER
5. CREATE function `enforce_cash_on_hand()` trigger + AFTER INSERT/UPDATE triggers on listed tables
6. CREATE function `generate_installment_schedule(contributor_id)` + trigger on insert
7. CREATE cron job
8. Permission rows insert

**Frontend new files:**
- `src/pages/dashboard/accounting/capital/Contributors.tsx`
- `src/pages/dashboard/accounting/capital/Transactions.tsx`
- `src/pages/dashboard/accounting/capital/Schedule.tsx`
- `src/pages/dashboard/accounting/capital/Dashboard.tsx`
- `src/components/accounting/CashOnHandBanner.tsx` (reusable warning)
- `src/lib/accountingErrors.ts` — `INSUFFICIENT_CASH` error code → Bangla message handler

**Edits:**
- `src/App.tsx` — 4 new routes
- `src/components/AppSidebar.tsx` — accounting group এ 4 new items
- `src/lib/menuItemModuleMap.ts` — 4 new mappings
- `src/pages/dashboard/accounting/CashBook.tsx` — new rows, negative warning
- `src/pages/dashboard/accounting/Expense.tsx`, `Income.tsx`, `AccountingDashboard.tsx` — banner ও error handler

**Excluded scope (next phase, যদি চান):**
- Multi-currency
- Audit log alada (existing audit ব্যবহার হবে)
- Investor profit-share auto-calc (manual entry for now)

---

confirm করলে migration আগে, তারপর কোড সব একসাথে।
