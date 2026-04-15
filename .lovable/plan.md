

## Plan: Implement Bandwidth Sale Module

### Overview
Build the full Bandwidth Sale module with 4 functional pages + 1 customer detail view, matching the Galaxy Net portal screenshots. Requires new database tables for customers, collections, and recurring invoices.

### Database Migration
New tables needed (existing: `bw_sale_pops`, `bw_sales_invoices`):

- **`bw_sale_customers`** — Customer Name, Customer Code, Contact Person, Email, Mobile, Phone, POP Status (FK to `bw_sale_pops`), Reference By, Address, Remarks, Facebook URL, Skype ID, Website, NTTN Info, VLAN Info (jsonb), SCR/Link ID, Activation Date, IP Addresses (jsonb), POP Name (Last Mile), Username, Password, Activity Status
- **`bw_sale_collections`** — R.Date, customer_id (FK), invoice_id (FK), amount, discount, balance_due, received_by, note/remarks, payment_method, status (pending/approved), created_by, created_at
- **`bw_sale_recurring`** — pop_id (FK), start_date, end_date, repeat_date (int days), status (Enabled/Disabled), bill_amount

Also alter `bw_sales_invoices` to add: `customer_id`, `contact_person`, `paid_amount`, `discount`, `due`, `created_by`

### Pages (6 files)

**1. POP (`Pop.tsx`)** — Customer list per POP:
- Table: Customer name, Balance Due, Action (view/edit/delete)
- `+ Customer` button opens 3-step wizard dialog:
  - Step 1: Customer Information (name, code, contact, email, mobile, phone, POP status, reference, address, remarks, socials)
  - Step 2: Transmission Information (NTTN, VLAN pairs, SCR/Link ID, activation date, IP addresses, POP name)
  - Step 3: Login Information (username, password, confirm password, activity status)
- Show entries + search + pagination

**2. Sales Invoice (`Invoices.tsx`)** — Invoice dashboard:
- 8 summary cards (Total Sales Amount, Collected, Due, Discount, Total/Paid/Due/Unpaid Invoice counts)
- Collapsible summary section with Hide/Show toggle
- Filters: Month, Payment Status, Customer, Created By
- Table: SN, Customer, Contact Person, Bill No, Invoice of Month, Total Amount, Received Amount, Discount, Due, Created By, Created On, Status, Action (Pay/View/Edit/Delete)
- `+ Create Invoice` button, Generate PDF/CSV

**3. Bill Collection (`Collection.tsx`)** — Daily bill collection:
- Filters: POP, From Date, To Date, Received By, Created By, Transaction Status
- Generate CSV/PDF buttons
- Table: R.Date, Company Name, Contact Person, Mobile, Invoice No, Bill Month, Bill Amount, Received, Discount, Balance Due, Received By, Created By, Created On, Note/Remarks, Action
- `+ Receive Bill` button, Approve/Delete selected transactions
- Total row at bottom

**4. Recurring Invoice (`Recurring.tsx`)** — Recurring billing setup:
- Table: SN, POP Name, Start Date, End Date, Repeat Date, Status, Bill Amount, Action
- `+ Invoice` button to create new recurring rule
- Total bill amount row

**5. Customer Detail (`CustomerView.tsx`)** — New file:
- Left sidebar: Avatar, customer name, Password Regenerate, Login As Client, Download Info, Go To Client List buttons
- Right content: 4 tabs (Personal Information, Transmission Information, Invoice Information, Product & Service Sales Invoices)
- Invoice tab: table with SN, Bill No, Bill Month, Bill Amount, Paid Amount, Discount, Due, Status badge, Action
- Total row at bottom

**6. Routes (`App.tsx`)** — Add:
- `/dashboard/bw-sale/pop/:id` → CustomerView

### Technical Details
- 1 migration file (new tables + alter existing)
- 5 page files created/rewritten
- 1 route added in App.tsx
- Types auto-updated
- All Bangla labels, teal headers, Galaxy Net aesthetic
- Mobile-responsive with overflow-x-auto tables

### Files
- Migration: `create bw_sale_customers, bw_sale_collections, bw_sale_recurring + alter bw_sales_invoices`
- `src/pages/dashboard/bw-sale/Pop.tsx`
- `src/pages/dashboard/bw-sale/Invoices.tsx`
- `src/pages/dashboard/bw-sale/Collection.tsx`
- `src/pages/dashboard/bw-sale/Recurring.tsx`
- `src/pages/dashboard/bw-sale/CustomerView.tsx` (new)
- `src/App.tsx`

