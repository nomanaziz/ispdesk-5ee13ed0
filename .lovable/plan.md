

## লক্ষ্য
Branch Funding (POP-কে Fund দেওয়া) page-কে production-ready করা — searchable POP dropdown + complete Fund form + proper MAC Reseller Fund History।

## ১. Funding Form Improvements (image-152 অনুযায়ী)

বর্তমান Funding page (`src/pages/dashboard/branches/Funding.tsx`)-এ POP dropdown plain `Select` — list বড় হলে scroll করা কঠিন। সম্পূর্ণ নতুন form:

### Searchable POP Combobox
- Replace plain `<Select>` → `Command` + `Popover` based searchable combobox (shadcn pattern)
- POP-এর `pop_code` (4-digit) + `name` + manager name দেখাবে
- Search by code OR name (e.g., "0013" বা "DELPARA")
- Display format: `[0013] DELPARA POP 2 — Md Arif`

### Complete Form Fields (image-152)
Current form: `branch_id, amount, type, description` — অপ্রতুল

**নতুন fields:**
| Field | Type | Notes |
|---|---|---|
| Reseller Name (POP) | searchable combobox | required |
| Funding Amount | number | required, min 1 |
| Received Amount | number | required (actual cash received) |
| Discount | number | optional, default 0 |
| Invoice Number | text | auto-generated (`FND-{seq}t{date}{rand}PV`) but editable |
| Received By | select (users) | required |
| Received Date | date | default today |
| Payment Method | select | bKash / Nagad / Cash / Bank |
| Remarks | textarea | optional |

### Auto-calc Logic
- `due = funding_amount - received_amount - discount`
- Save করার সময় POP-এর `branch_managers.balance` += `funding_amount` (credit)
- যদি `due > 0` → status = `pending`, নাহলে `paid`

## ২. MAC Reseller Fund History Page (image-153, image-154)

নতুন page: `src/pages/dashboard/branches/FundingHistory.tsx`

### Tabs (top)
- **Branch Funding** (current page — manual fund add)
- **Fund History** (নতুন — সব transaction history)

### Filters Row
- MAC Reseller dropdown (searchable, multi-select optional)
- Transaction Type: `Fund(+)` / `Refund(-)` / `Received` / `Discount` / `Advance`
- From Date / To Date

### Table Columns
`ResellerName | InvoiceNumber | ReceiptNumber | Trans.Type | Fund(+) | Refund(-) | Paid | P.Processing Fee | Vat | Discount | Due | Remarks | ReceivedOn | ReceivedBy | CreatedOn | CreatedBy | Action`

### Transaction Sources (auto-aggregated)
১. **Manual Fund** — admin দেওয়া fund (current Funding page থেকে)
২. **Online Recharge** — client portal payment gateway থেকে আসা টাকা যা POP-এর share হিসেবে credit হয়
৩. **Tariff Deduction** — POP-এর client recharge-এ যে tariff rate কাটা হয় (debit)
৪. **Credit Refund** — already implemented (`credit_refund_logs`)

Total row footer-এ সব column-এর sum।

## ৩. Database Changes (migration)

### Existing `branch_funding` table-এ column যোগ
- `received_amount` numeric default 0
- `discount` numeric default 0
- `due_amount` numeric generated/computed
- `invoice_number` text unique
- `receipt_number` text
- `received_by` uuid (references users)
- `payment_method` text
- `processing_fee` numeric default 0
- `vat` numeric default 0
- `trans_type` text default 'fund' — `fund | refund | received | discount | advance`
- `remarks` text

### Auto invoice number trigger
Sequence + trigger যেমন `set_pop_code` — pattern: `FND-{seq}t{YYYYMMDD}PV`

## ৪. Online Recharge Flow Note (future step এর preparation)

User mentioned: client online recharge হলে → tariff rate POP-এর কাছ থেকে কাটবে, বাকিটা reseller portal-এ জমা থাকবে। এটা **পরবর্তী step**, এই plan-এ শুধু:
- Schema-তে `trans_type='received'` field রাখা হবে যাতে future-এ payment-callback edge function এই table-এ row insert করতে পারে
- UI-তে এই type display করার ব্যবস্থা থাকবে

বাস্তব auto-recharge logic পরের iteration-এ।

## ৫. Files Changed

**Migration**:
- ➕ `branch_funding` table extended columns
- ➕ Sequence + trigger for invoice number
- ➕ Trigger to update `branch_managers.balance` on funding insert

**Code**:
- ✏️ `src/pages/dashboard/branches/Funding.tsx` — searchable POP combobox + complete form fields + auto-invoice
- ➕ `src/pages/dashboard/branches/FundingHistory.tsx` — new history page with filters + table
- ✏️ `src/components/AppSidebar.tsx` — "Branch Funding" sub-menu-তে "Fund History" link যোগ
- ✏️ `src/App.tsx` — new route registration

## কী **হবে না** (এই step-এ)
- Online payment auto-recharge logic (পরের step)
- Tariff-based auto-deduction logic (পরের step)
- "Minimum activation date" enforcement on reseller-initiated client recharge (পরের step)
- পুরাতন funding rows-এ retroactive invoice number generation

