

## Reports Module — Full Implementation Plan

User চান `Report` section-এর সব sub-page complete implementation। Screenshots দেখে ৭টা page identify করেছি।

### Pages to implement (all under `/dashboard/reports/`)

| # | Page | Route | Status |
|---|---|---|---|
| 1 | Bill Collection | `/reports/bill-collection` | Rewrite |
| 2 | Discount Report | `/reports/discount` | Rewrite |
| 3 | Customer Report | `/reports/customer` | Rewrite |
| 4 | Messages Report | `/reports/messages` | Rewrite |
| 5 | Due Customer SMS | `/reports/due-sms` | Rewrite |
| 6 | Pay. Processing Fee | `/reports/processing-fee` | Rewrite + Settings |
| 7 | BTRC Monthly Report | `/reports/btrc` | Rewrite |
| 8 | Financial Transactions | `/reports/financial` | Verify (already exists) |

### Common UI pattern (all pages)

- Page header with breadcrumb (Report > [Page Name])
- Filter panel (multi-column grid) — date range, dropdowns
- "Generate PDF" + "Generate CSV" buttons (top-right)
- Show entries selector (10/25/50/100/All) + Search box
- DataTable with sortable headers, pagination, totals row
- Empty state: "No data available"
- Existing color scheme: `#2c5f6e` headers, dark blue table headers

### Page-specific details

**1. Bill Collection** (image-100)
- Filters: username, payment_gateway, gateway_type, package, received_by, created_by, billing_status, zone, subzone, box, affiliator, creation from/to, receive from/to
- Columns: R.Date, C.Code, ID/IP, Name, Mobile, Zone, SubZone, Box, Package, B.Status, Affiliator, TrxId, MonthlyBill, Received, MoneyReceiptNo, CreatedBy, CreationDate, ReceivedBy, PaymentGateway, Note
- Source: `bills` (paid only) + `clients` + `payment_gateways`
- Total row: SUM(monthly_bill), SUM(received)

**2. Discount Report** (image-101)
- Filters: from/to date, received_by, created_by
- Columns: Code, ID/IP, Name, Zone, Package, Bill Amount, Discount, Date, Created By, Received By
- Source: `bills` where `discount > 0`
- Total: SUM(bill_amount), SUM(discount)

**3. Customer Report** (image-102)
- Filters: clients_of, custom_status, pop, server, protocol, client_type, b.status, from/to date
- Columns: Client Code, Username, Password (eye toggle), Customer Name, Contact, Client Type, Package, Server, Protocol, Profile, Monthly Bill, B.Status, POP, M.Status (mikrotik enable/disable toggle)
- Source: `clients` + `mikrotik_users` + `pops`
- Total: SUM(monthly_bill)

**4. Messages Report** (image-103, 104)
- Filters: user_type (Employee/Customer/MACReseller/BandwidthReseller/Others), sms_type (cascading: Money Receipt/Due/Line Man Support/Support Solved/Support Created), sms_status, to_send_by, customer/req_customer, bandwidth_pops, pop, from/to date
- Columns: LogNo, ToWhom, SMS Type, ToNumber, SMS Text, Date & Time, Status (Success badge)
- Source: `sms_logs`
- Bulk select + "Resend Bulk SMS" button

**5. Due Customer SMS** (image-105)
- Filters: from/to date
- Columns: SN, Date & Time, Client Code, Client Name, Mobile, Billing Month, Days Before
- Source: `sms_logs` where category = 'due_reminder'

**6. Pay. Processing Fee** (image-106) — **+ Settings page**
- **Settings** (`/dashboard/system/processing-fee` — already exists, will extend):
  - Per-reseller config: Admin / each Reseller / Reseller-clients-on-portal
  - Fields per row: Fee % (e.g., 1.5), Borne by (Company / Client / Split 50-50 / Custom %)
  - Stored in `system_settings.processing_fee_config` (JSONB array)
- **Report page**:
  - Filters: user_type, customer, pop, bandwidth_pops, from/to date
  - Columns: TrxNo, P.UType, Provider, Gateway, Fee Type, PaidAmount, Fee%, FeeAmount, VAT.Cer, App.VAT, VAT.Amount, Ex.FeeName, App.Ex.Fee, Ex.FeeAmount, P.P.FeeAmount, STL.Amount, CreatedBy, CreatedOn
  - Source: `bills` (paid via gateway) + `processing_fee_config` calculation

**7. BTRC Monthly Report** (image-BTRC-report)
- Filters: previous_month (auto-default), user_type (Admin/Reseller/per-reseller), pops, servers, service, client_type, connection_type, b.status, zone, date_format, allocated_ip_type (User ID/Real IP), distributed_point_type (NOC/POP), sub_zone, box, activation from/to
- Columns (BTRC required): client_type, connection_type, client_name, bandwidth_distribution_point, connectivity_type (Shared/Dedicated), activation_date, bandwidth_allocation, allocated_ip, division, district, thana, address, client_mobile, client_email, selling_price_bdt_excluding_vat
- Source: `clients` + `mikrotik_users` + `pops` + `zones` + `divisions` + `districts` + `upazilas` + `packages`
- "Sync Clients & Servers" button — refresh data
- "Generate Excel" instead of CSV (BTRC requires xlsx)
- Default filter: previous month's active clients only

### Database changes

**No new tables.** All data already exists in:
- `bills`, `clients`, `mikrotik_users`, `sms_logs`, `payment_gateways`, `pops`, `zones`, `subzones`, `packages`, `divisions`, `districts`, `upazilas`, `branches` (resellers)

**Extend `system_settings` only**:
- Key: `processing_fee_config`
- Value: `{ default: {fee_pct, borne_by, split_pct}, resellers: [{branch_id, fee_pct, borne_by, split_pct}], portal_clients: {fee_pct, borne_by, split_pct} }`

### Libraries
- PDF: `jspdf` + `jspdf-autotable` (likely already in project — will verify)
- Excel: `xlsx` (SheetJS) — for BTRC report
- CSV: built-in (no dependency)

### Files to create/edit

**Pages (rewrite all)**:
- `src/pages/dashboard/reports/BillCollection.tsx`
- `src/pages/dashboard/reports/Discount.tsx`
- `src/pages/dashboard/reports/Customer.tsx`
- `src/pages/dashboard/reports/Messages.tsx`
- `src/pages/dashboard/reports/DueSms.tsx`
- `src/pages/dashboard/reports/ProcessingFee.tsx`
- `src/pages/dashboard/reports/Btrc.tsx`

**Settings extension**:
- `src/pages/dashboard/system/SysProcessingFee.tsx` — extend with per-reseller table

**New shared component**:
- `src/components/reports/ReportLayout.tsx` — common header + filter panel + export buttons wrapper
- `src/lib/reportExport.ts` — PDF/CSV/Excel helper functions

### Phased delivery (recommend splitting)

**Phase 1**: BillCollection + Discount + Customer + DueSms (4 simpler pages)
**Phase 2**: Messages + ProcessingFee report + Settings extension
**Phase 3**: BTRC Monthly Report (most complex — schema joins + Excel + sync button)

Confirm: all 3 phases in one go, or Phase 1 first?

