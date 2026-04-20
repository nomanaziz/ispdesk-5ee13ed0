

## লক্ষ্য
"Client PGW Payments" আর "PGW Settlement" দুই page-কে একসাথে merge করে **৩-tab UI** বানানো — image-156 অনুযায়ী। "Add Payment" button সরিয়ে দেওয়া হবে; সব entry **automatic** আসবে online recharge থেকে।

## নতুন একক page: `PgwTransactions.tsx` (route: `/dashboard/branches/pgw-transactions`)

### Tab 1: POP PGW Transactions (default)
POP-wise rollup। Filters: POP Status, POP Type, Search।

**Columns**: Code | POP Name | POP Type (badge: Prepaid/Postpaid) | Mobile | **Total Received** | **Settled Amount** | **Remaining Amount** | Payment Status | **Action**

**Action column** per row (POP-এর remaining > 0 হলে দেখাবে):
- 🟦 **Cash** button → "Cash Payment" dialog (image-157):  
  POP Code, Name, Company, Mobile (auto-fill, read-only) + Payment Date, Paid Amount, Receipt/Trxn No, Remarks → submit হলে `reseller_pgw_settlements` row insert হবে method=`cash`, branch balance অপরিবর্তিত (cash বের হলো)।
- 🟩 **Fund** button → "Fund Transactions" dialog (image-158) ২টি sub-tab:
  - **Due Fund Invoice** — POP-এর pending `branch_funding` invoices list, একটা select করে remaining PGW amount দিয়ে adjust।
  - **Give Fund** — Remaining PGW Payment (read-only), Funding Amount, Invoice Number (auto), Fund Date, Remarks → submit হলে `branch_funding` row (trans_type=`received`) insert; existing trigger POP balance বাড়াবে এবং `reseller_pgw_settlements` row method=`fund` লেখা হবে।

Remaining = ০ হলে status badge "✓ Fully Settled", action buttons disabled।

### Tab 2: Transaction Settlement History (image-159)
Filters: From/To Date, Payment Settlement Status (auto/manual/all), POP।

**Columns**: POP Code | POP Name | Amount | Invoice Number | Remarks | CreatedBy | CreatedOn | **Status** (Auto Settled / Cash / Fund — colored badge) | Action (👁 view detail)। Total row footer।

Source: `reseller_pgw_settlements` table।

### Tab 3: POP Transactions (image-160 — current "Client PGW Payments")
Filters: From/To Date, POPs। Export buttons (CSV/PDF)।

**Columns**: POP | ClientCode | Paid Amount | Settled Fund Amount | Remaining Amount | PaymentMethod | Remarks | CreatedBy | CreatedOn। Total row footer।

Source: `reseller_pgw_payments` table (existing) + per-row settlement linkage।

## Database changes

### `reseller_pgw_settlements` table — column যোগ
- `settlement_type` text default `'manual'` — `'auto' | 'cash' | 'fund'`
- `funding_id` uuid nullable → references `branch_funding(id)` (যখন method=fund)
- `pgw_payment_ids` uuid[] nullable — কোন কোন PGW payment cover করল
- `created_by` uuid nullable

### `reseller_pgw_payments` table — column যোগ
- `settled_amount` numeric default 0
- `remaining_amount` numeric (computed via trigger: `our_share - settled_amount`)
- `settlement_status` text default `'pending'` — `'pending'|'partial'|'settled'`

### Trigger
`trg_apply_settlement_to_pgw_payments` — settlement insert হলে FIFO order-এ POP-এর pending PGW payments-এ `settled_amount` বাড়াবে এবং status update করবে।

## Auto-settlement (existing online recharge flow সহযোগিতা)
যখন client portal payment gateway দিয়ে recharge করে → existing `payment-callback` edge function `reseller_pgw_payments` row লেখে। এটাতে শুধু **নতুন logic** যোগ:
- যদি POP-এর `auto_settle_pgw` flag ON থাকে (নতুন `branch_managers.auto_settle_pgw boolean default false` column) → automatic একটা `reseller_pgw_settlements` row type=`auto` insert হবে।
- নাহলে pending থাকবে যতক্ষণ admin Cash বা Fund button চাপে।

## Files Changed

**Migration**:
- `reseller_pgw_settlements`-এ ৪টা column
- `reseller_pgw_payments`-এ ৩টা column
- Settlement allocator trigger
- `branch_managers.auto_settle_pgw` column

**Code**:
- ➕ `src/pages/dashboard/branches/PgwTransactions.tsx` — নতুন ৩-tab page
- ➕ `src/components/branches/PgwCashDialog.tsx`
- ➕ `src/components/branches/PgwFundDialog.tsx` (Due Fund Invoice + Give Fund tabs)
- ✏️ `src/components/AppSidebar.tsx` — পুরাতন "Client PGW Payments" + "PGW Settlement" sub-menu রিমুভ, একটাই "PGW Transactions" link
- ✏️ `src/App.tsx` — route registration; পুরাতন routes redirect
- ✏️ `supabase/functions/payment-callback/index.ts` — auto-settle ঢোকানো
- ❌ Old: `src/pages/dashboard/branches/PgwPayments.tsx` ও `PgwSettlement.tsx` — replace হবে নতুন page দিয়ে (ফাইল রাখা যাবে কিন্তু sidebar/route থেকে আনহুক)

## কী **হবে না**
- Manual "Add Settlement" button আর থাকবে না — শুধু row-level Cash/Fund action
- পুরাতন settlement rows-এ retroactive linkage হবে না
- `reseller_pgw_payments`-এ existing rows-এর `settled_amount` migration-এ ০ থেকে শুরু হবে

