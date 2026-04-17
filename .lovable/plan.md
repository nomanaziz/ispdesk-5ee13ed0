

## BW Sale Simplification — Galaxy Net Parity (Subscription বাদ)

### সমস্যা সংক্ষেপ

User আমার current implementation-কে **জটিল** বলছেন। তাঁর Galaxy portal screenshots অনুযায়ী BW Sale **অনেক সহজ** — কোনো subscription/service-change-log নেই। শুধু:

1. **POP Client list** — সব POP/reseller customer + Balance Due overview (image-82)
2. **Customer Detail page** — 4 tabs: Personal / Transmission / Invoice / Product&Service Ledger (image-83, 84)
3. **Invoice Detail page** — Bill info + line items table (Item, Qty, Rate, VAT, From Date, To Date, Total) + Payment info table (image: invoice.png)
4. **Bill Collection / Daily Bill** page — POP filter, date range, "Receive Bill" button, Approve checkbox (image-85)
5. **Receive Bill dialog** — Payable / Previous / Approvable / Balance Due → Received Amount, Discount, Receipt No., Remarks (image-86)
6. **Recurring Invoice list + Create form** — POP-wise recurring template (Repeat Date, Start/End, line items) (image-87, 88)
7. Excel sample (image-89): Service Name | BW (Mbps) | Price (per Mbps) | Total — শুধু এই কাঠামো

### Color/Theme Bug

Bandwidth pages-এ "উপরে black color" আসছে — অন্য admin pages-এর সাথে mismatch। Recent BW Sale rewrite-এ কোথাও hardcoded dark header inject হয়েছে।

### বর্তমান অবস্থা (audit)

আমি যেটা banaiyechi:
- `bw_customer_subscriptions`, `bw_service_change_log` tables — **user চান না**
- `Subscriptions.tsx`, `bwSaleProrate.ts` segment builder — **user চান না**
- Pro-rate billing engine ঠিকই দরকার, কিন্তু **invoice line item-এ from/to date + qty (days × mbps logic) hand-entered বা auto-filled** ভাবে কাজ করবে — subscription tracking ছাড়াই

### Plan — Simplified BW Sale (Galaxy parity)

#### 1. DB cleanup (migration)

**Drop / Deprecate:**
- `bw_customer_subscriptions` (data থাকলে archive)
- `bw_service_change_log`

**Keep & extend:**
- `bw_sale_customers` (POP/reseller list)
- `bw_sale_services` (Item master: name, default rate, unit) — invoice form-এ dropdown source
- `bw_sale_invoices` (invoice_no, customer_id, billing_month, payment_due_date, special_note, remarks, total, paid, due, status)
- `bw_sale_invoice_items` (invoice_id, item_id, item_name, description, quantity, rate, vat_pct, from_date, to_date, total) — manual rows, যেমন user-এর invoice screenshot
- `bw_sale_payments` (invoice_id, date, method, amount, discount, receipt_no, received_by, remarks, approved, approved_by)
- `bw_sale_recurring_invoices` (customer_id, repeat_date, start_date, end_date, status, remarks)
- `bw_sale_recurring_items` (recurring_id, item_id, description, quantity, rate, vat_pct) — template

**Removed concept**: subscription, service-change log, segment builder।

#### 2. UI rewrite (Galaxy-style)

| Page | File | Behavior |
|------|------|----------|
| POP Client list | `bw-sale/CustomerView.tsx` | Search box + table (Customer, Contact, Email, Mobile, Balance Due, Action: View/Edit/Delete). "Total Due" footer। (image-82) |
| Customer Detail | `bw-sale/CustomerDetail.tsx` (NEW) | Left card: avatar + name + Password Regenerate / Login as Client / Download Info / Back. Right tabs: Personal / Transmission / **Invoice Information** (table with Bill No, Month, Amount, Paid, Discount, Due, Status badge, Action) / **Product & Service Sales Invoices** = Customer Ledger (Date, Creation Date, Type, Invoice No, Debit, Credit, Balance) (image-83, 84) |
| Invoice Detail | `bw-sale/InvoiceDetail.tsx` | Bill Info card (Invoice No, Billing Month, Customer, Due Amount, Payment Due, Special Note) + Remarks editor + Items table (SN, Item ID, Item, Description, Quantity, Rate, VAT, From, To, Total) + Payment Info table (SN, Date, Method, Description, Amount, Discount, Paid By, Received By, Action) (invoice.png) |
| Bill Collection | `bw-sale/Collection.tsx` | Filters: POP, From, To, Received By, Created By, Status. Table: R.Date, Company, Contact, Mobile, Invoice No, Bill Month, Amount, Received, Discount, Balance Due, ReceivedBy, CreatedBy, CreatedOn, Note, Action (delete), checkbox column. Top buttons: Generate CSV/PDF, Delete Selected, Approve Selected, **Receive Bill** (image-85) |
| Receive Bill dialog | `bw-sale/ReceiveBillDialog.tsx` (NEW) | POP, Bill Month, Due Invoices dropdown → fills POP Name/Mobile/Invoice No/Month, Payable/Previous/Approvable/Balance Due read-only, Received Amount, Discount, Receipt No, Payment Method, Remarks, Submit (image-86) |
| Invoice Form (manual) | `bw-sale/InvoiceForm.tsx` | Item dropdown sourced from `bw_sale_services` (with "+ create new" option), Description, Unit, Qty (= Mbps or days × mbps depending on item), Rate, VAT %, From/To Date, Total auto-calc per row, grand total. Remarks editor. (matches recurring form image-88) |
| Recurring list | `bw-sale/Recurring.tsx` | Table: SN, POP Name (clickable), Start, End, Repeat Date, Status, Bill Amount, Action (image-87) |
| Recurring create | `bw-sale/RecurringForm.tsx` (NEW) | Customer, Auto Invoice No, Billing Month, Repeat Date, Payment Due, Start, End, items table same as InvoiceForm, Remarks (image-88) |

#### 3. Pro-rate logic (kept, simplified)

**No subscription table.** Pro-rate happens **inside invoice item row** when user enters `From Date` + `To Date` + `Rate` + `Quantity (Mbps)`:

```
days = inclusive(From, To)
total_days_in_month = days in billing month
amount = Quantity × Rate × days / total_days_in_month
```

For full-month items, `days == total_days_in_month` so `amount = Qty × Rate` — exact like Excel sample (image-89: 150 × 210 = 31500).

For Excel sample case (full month, no proration), the formula naturally degenerates to `Mbps × Price = Total` ✓।

If admin upgrades mid-month, **two separate rows**: one with old qty + dates 1–15, one with new qty + dates 16–30. Manual control, exactly Galaxy behavior.

#### 4. Recurring auto-generation

- Cron-style edge function `generate-recurring-bw-invoices` runs daily।
- For each `bw_sale_recurring_invoices` where `repeat_date == today.day` and within start/end range → clone template into new `bw_sale_invoices` + items for current month।
- Generated invoice editable from Invoice page।

#### 5. Theme/color fix

- `bw-sale/*` pages-এ `bg-slate-900` / hardcoded dark Card header খুঁজে remove করব।
- Standard `Card` + `CardHeader` (project default) ব্যবহার করব — অন্য admin pages-এর সাথে identical।

#### 6. Reseller portal Bandwidth Sell view

POP login করলে তার নিজের invoices + ledger same Customer Detail tabs দেখা যাবে (read-only + pay action)।

### Files

| Action | File |
|--------|------|
| Migration | drop subscriptions/change-log, ensure recurring tables, ensure invoice_items columns |
| NEW | `src/pages/dashboard/bw-sale/CustomerDetail.tsx` |
| NEW | `src/components/bw-sale/ReceiveBillDialog.tsx` |
| NEW | `src/pages/dashboard/bw-sale/RecurringForm.tsx` |
| Edit | `CustomerView.tsx` (image-82 layout) |
| Edit | `InvoiceDetail.tsx` (invoice.png layout) |
| Edit | `Collection.tsx` (image-85 layout, Receive Bill button) |
| Edit | `InvoiceForm.tsx` (manual rows, no auto-segment) |
| Edit | `Recurring.tsx` (image-87 layout) |
| Edit | `Subscriptions.tsx` for BW Buy → keep as-is (Buy side still needs it for provider tracking, OR also simplify) |
| Edit | `App.tsx` routes |
| Edit | `AppSidebar.tsx` — remove BW Sale "Subscriptions" link |
| Delete | `bw-sale/Subscriptions.tsx` (sale side) |
| Edit | `bwSaleProrate.ts` — simplify to single-row helper `lineAmount(qty, rate, from, to, billingMonth)` |
| NEW edge fn | `generate-recurring-bw-invoices` |
| Theme fix | scan `bw-sale/*` for hardcoded dark classes |

### Question (1, blocking)

BW **Buy** side (provider bills) এ আমার বানানো subscription + service-change-log রাখব নাকি ওটাও simplify করে শুধু **manual invoice rows + recurring** model-এ আনব (Galaxy-এর "Bandwidth Buy" page-ও তো একই pattern-এ থাকে সাধারণত)?

