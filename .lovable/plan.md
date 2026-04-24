# Accounting Upgrade Plan

তিনটা আলাদা কাজ একসাথে করব — সব ই accounting module-কে production-ready করার জন্য।

---

## ১. Accounting Dashboard আরও Informative ও Interactive

বর্তমান `AccountingDashboard.tsx`-এ ৮টা stat card + ২টা chart আছে। Galaxy Net-এর reference image-এর মতো full-feature করব।

### নতুন Features
- **Date range filter** — preset (আজ / এই সপ্তাহ / এই মাস / গত মাস / কাস্টম range picker)। সব stats এই range অনুযায়ী filter হবে।
- **Top KPI strip (৩টা বড় card)** — মোট আয়, মোট ব্যয়, **মোট লাভ** (income − expense), color-coded।
- **Receivables/Payables row** — Expected Payments from Customers (unpaid invoice total), Expected Payments to Vendors (unpaid PO total), Total Upcoming।
- **Cash position row** — Cash on Hand, Cash, bKash, Bank, Nagad ইত্যাদি প্রত্যেক payment_method ভিত্তিক balance (income − expense per method)।
- **Income by Category** — horizontal bar chart (Recharts), category-wise total with labels।
- **Expense by Category** — horizontal bar chart, একই pattern।
- **Latest Incomes table** — date / category / amount, last ১০টা।
- **Latest Expenses table** — date / category / amount, last ১০টা।
- **Existing pie + monthly bar chart** — রাখব নিচে।

### Technical
- File: `src/pages/dashboard/accounting/AccountingDashboard.tsx` rewrite।
- Data source: `income_entries`, `expense_entries`, `client_invoices` (unpaid), `purchase_orders` (unpaid)। সব React Query।
- Receivables = `client_invoices` থেকে `total - paid_amount` যেগুলো `status != 'paid'`।
- Payables = `purchase_orders` যেগুলো `payment_status != 'paid'`।
- Cash by method = `income_entries.payment_method` group sum minus `expense_entries.payment_method` group sum।
- Bangla labels রাখব সব জায়গায়।

---

## ২. TopBar-এ Admin-only "Accounting Quick" Shortcut

`src/components/TopBar.tsx`-এ Online Monitoring icon-এর পাশে একটা **Wallet** icon button যোগ করব।

- শুধু `isAdmin` হলে render হবে (existing `useAuth().isAdmin` pattern follow)।
- Click → `/dashboard/accounting`।
- Tooltip: "অ্যাকাউন্টিং ড্যাশবোর্ড / Accounting Dashboard"।
- Employee/Operator role-এ visible হবে না, কিন্তু যদি কারও কাছে accounting permission আছে তবুও `isAdmin` check হবে — কারণ user বলেছেন "শুধু admin"।

---

## ৩. Chart of Accounts — Galaxy Net Style Seed + Grouped UI

বর্তমানে `chart_of_accounts` table empty। ৬টা reference image বিশ্লেষণ করে standard ISP chart seed করব।

### Database Migration
1. `chart_of_accounts`-এ একটা `subtype` column add করব (text, nullable) — যেমন "Cash and Bank", "Operating Expense", "Discount", "Payroll Expense" ইত্যাদি grouping-এর জন্য।
2. Seed insert করব ~৮৬টা account, image অনুযায়ী:
   - **Asset (24)**: Cash and Bank (১৭) — aamarPay, Bank, bKash, Cash, Cash on Hand, Foster Payments, MCash, Nagad, Other, PhonePe, Razorpay, Rocket, SSL Commerz, Stripe, SureCash, UCash, Walletmix; Expected Payments from Customers (৬); Inventory (১) — Stock।
   - **Expense (40)**: Cost of Goods Sold (১), Discount (২), Operating Expense (১৫), Payment Processing Fee (৪), Payroll Expense (৬), Uncategorized Expense (১২)।
   - **Income (14)**: Discount (৭), Income (৬), Uncategorized Income (১)।
   - **Liabilities (6)**: Customer Prepayments (২), Due For Payroll (১), Expected Payments to Vendors (৩)।
   - **Owner's Equity (2)**: Owner Investment, Owner's Equity।
3. প্রত্যেক account-এর code reference image-এর মতো (1000-series for Cash/Bank, 1200 Receivables, 1300 Inventory, 2200 Payables, 2400 Payroll Liab, 2600 Customer Prepay, 3000 Equity, 4000 Income, 5000 Expense)।

### UI Rewrite — `ChartOfAccounts.tsx`
Reference image-এর মতো সাজাব:
- **৫টা Tab** উপরে: Asset / Expense / Income / Liabilities / Owner's Equity, প্রত্যেকটার পাশে count badge।
- **Status filter** dropdown (Active / Inactive) উপরে বাঁদিকে।
- **+ Create New Account** button উপরে ডানে।
- প্রত্যেক tab-এ **subtype অনুযায়ী collapsible/grouped sections** (যেমন "Cash and Bank", "Inventory"), প্রতিটা section header dark blue band style, ভিতরে rows: code | name | description | edit icon।
- Empty subtype-এ "No Data Found" message।
- Section header-এ section-specific "+ Create New Account" button (subtype prefilled হবে)।
- Add/Edit dialog-এ subtype dropdown যোগ হবে (type অনুযায়ী filter)।

### Technical Notes
- Existing search/balance column drop করব (image-এ নেই) — শুধু code, name, description, action।
- `description` column already nullable text হিসেবে আছে কিনা check করতে হবে — যদি না থাকে migration-এ add করব।
- Bengali UI text বজায় থাকবে।

---

## Files to Edit / Create

```text
supabase/migrations/<new>.sql        — subtype/description columns + seed inserts
src/pages/dashboard/accounting/AccountingDashboard.tsx   — full rewrite
src/pages/dashboard/accounting/ChartOfAccounts.tsx       — full rewrite (tabs + grouped)
src/components/TopBar.tsx            — admin-only Wallet shortcut
```

কোনো existing data হারাবে না — seed `ON CONFLICT (code) DO NOTHING` দিয়ে safe insert হবে।

Approve করলে implementation শুরু করব।