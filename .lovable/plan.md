

## BW Sale — Full A-to-Z Implementation (Galaxy Portal Parity)

### লক্ষ্য
Galaxy portal-এর `/bandwidthcustomer/*` সব section আমাদের ERP-এর BW Sale module-এ সম্পূর্ণ implement করা, এবং invoice generation কে **service-wise + date-range based pro-rated** করা (যেমন BW Buy যেভাবে multi-provider/multi-service handle করে)।

### বর্তমান অবস্থা (Audit)

আমাদের ERP-এ এখন আছে:
- `src/pages/dashboard/bw-sale/Pop.tsx` — Customer/POP list
- `src/pages/dashboard/bw-sale/Collection.tsx` — Payment collection
- `src/pages/dashboard/bw-sale/Recurring.tsx` — Recurring billing
- `src/pages/dashboard/bw-sale/CustomerView.tsx` — Customer detail
- `src/pages/dashboard/bw-sale/Invoices.tsx` — flat-price invoice (single `amount` field — **এটাই সমস্যা**)

কিন্তু Galaxy portal-এ আছে আরও: **Subscription/Service Lines, Service Change History (upgrade/downgrade with date), Pro-rated Invoice Generation, Service-wise Reports, Customer Statement/Ledger, SMS notifications, Bandwidth Usage Graph, Tickets per customer।**

`bw_sales_invoices` table-এ এখন শুধু flat `amount` — কোনো **invoice items / service breakdown / date-range** নেই।

### Phase 1 — Galaxy Portal Recon (FIRST STEP)

Login করে Galaxy portal-এর প্রতিটি menu screenshot/note করব এবং exact feature list বের করব:

```
/bandwidthcustomer/index           → Customer list page
/bandwidthcustomer/create          → Add customer form fields
/bandwidthcustomer/{id}            → Customer detail tabs
/bandwidthcustomer/services/{id}   → Service subscription with date range
/bandwidthcustomer/invoice/...     → Invoice generation logic
/bandwidthcustomer/payment/...     → Payment/collection
/bandwidthcustomer/report/...      → Reports
```

**Tool plan:** `browser--navigate_to_url` → login → traverse each `/bandwidthcustomer/*` page → `browser--screenshot` + `browser--extract` to capture form fields, table columns, action buttons. Output a structured feature matrix before any code change.

### Phase 2 — Database Redesign (Service-wise Invoicing)

**নতুন tables (migration):**

```
bw_sale_services         (id, name, code, unit, default_rate)
                         e.g. Internet/IIG, BTCL/NIX, FB-Cache, Akamai, DHC, Afan
bw_customer_subscriptions (id, customer_id, service_id, bandwidth_mbps,
                           rate_per_mbps, start_date, end_date NULL,
                           status, remarks)
bw_invoice_items          (id, invoice_id, subscription_id, service_id,
                           service_name, bandwidth_mbps, rate, 
                           period_start, period_end, days, amount)
bw_service_change_log     (id, customer_id, service_id, old_mbps, new_mbps,
                           effective_date, changed_by)
```

`bw_sales_invoices` keep: header (`customer_id`, `invoice_no`, `month`, `total_amount`, `paid`, `due`, `status`), but `amount` will be **derived sum of items**।

### Phase 3 — Invoice Generation Logic (Pro-rated)

**Algorithm** (per customer, per billing month):

```
input: customer_id, month_start, month_end (e.g. 1-30 Apr)
items = []
for each subscription where service is active in this period:
    segments = split subscription by change_log within [month_start, month_end]
    for each segment (mbps, rate, seg_start, seg_end):
        days  = seg_end - seg_start + 1
        amount = (mbps * rate * days) / total_days_in_month
        items.push({service, mbps, rate, period: seg_start..seg_end, days, amount})
total = sum(items.amount)
```

**Example (user's scenario):**
- Sub: 100 Mbps Internet, rate 500 Tk/Mbps/month
- Day 11: upgrade to 200 Mbps
- April invoice items:
  - `Internet 100Mbps × 10 days (1-10 Apr) = 100×500×10/30 = 16,667`
  - `Internet 200Mbps × 20 days (11-30 Apr) = 200×500×20/30 = 66,667`
  - **Total: 83,333 Tk**

### Phase 4 — UI Pages (New + Rewrite)

| Page | Action |
|------|--------|
| `bw-sale/Customers.tsx` (rename Pop) | Customer list with Service summary column |
| `bw-sale/CustomerForm.tsx` | Add/Edit customer + initial subscriptions |
| `bw-sale/CustomerDetail.tsx` (rewrite CustomerView) | Tabs: Profile / Subscriptions / Service Changes / Invoices / Payments / Tickets / Ledger |
| `bw-sale/Services.tsx` (NEW) | CRUD `bw_sale_services` (Internet/NIX/FB/Akamai/DHC/Afan) |
| `bw-sale/Subscriptions.tsx` (NEW) | All active subscriptions across customers, filter by service |
| `bw-sale/ServiceChangeDialog.tsx` (NEW) | Upgrade/Downgrade with effective_date — writes change_log + closes old subscription + opens new |
| `bw-sale/Invoices.tsx` (rewrite) | Header + expandable rows showing line items |
| `bw-sale/InvoiceForm.tsx` (NEW) | Generate invoice → auto-pull subscriptions → preview line items → save |
| `bw-sale/InvoiceDetail.tsx` (NEW) | Print-ready, with line items |
| `bw-sale/BulkGenerate.tsx` (NEW) | "Generate Monthly Invoices" — batch for all active customers |
| `bw-sale/Collection.tsx` | (keep, link to invoice items) |
| `bw-sale/Reports.tsx` (NEW) | Service-wise revenue, due, customer-wise statement |

### Phase 5 — Reseller Portal Sync

`ResellerInvoices.tsx` / `ResellerInvoiceDetail.tsx` / `ResellerInvoicePrint.tsx` — show line items (image-77 layout: Internet/PNI/GCC rows with date range)। Already partly there — wire to new `bw_invoice_items` table।

### Phase 6 — Edge Function

`generate-bw-sale-invoices` — monthly cron-callable function that runs the pro-rate algorithm for all active BW customers and inserts invoice + items।

### Execution Order

1. **Recon** Galaxy portal (browser tools) → produce feature matrix
2. **Migration** for new tables + alter `bw_sales_invoices` (add `total_amount`, keep `amount` as alias temporarily)
3. **Services** CRUD page first (foundation)
4. **Subscriptions** + Service Change dialog (data entry)
5. **Invoice generation** (manual single + bulk + edge function)
6. **Customer detail tabs** rewrite
7. **Reseller portal** invoice line-item display
8. **Reports**

### Phasing Decision

This is **very large** (10+ new pages, 4 new tables, edge function, reseller sync)। আমি প্রস্তাব করছি:

- **Phase 1A (এই loop):** Galaxy portal recon + migration + Services CRUD + Subscriptions + Service Change dialog + new Invoice generation engine (manual single invoice with line items) + new Invoice detail page। Reseller portal-এও line items show করানো।
- **Phase 1B (পরবর্তী loop):** Bulk monthly generation, edge function cron, Customer Detail tabs full rewrite, Reports।

এতে এই loop-এ end-to-end একটা service-wise invoice তৈরি ও দেখা যাবে (user's exact scenario test করা যাবে), এবং পরের loop-এ automation + reports।

