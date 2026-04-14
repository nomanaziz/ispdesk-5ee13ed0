

## Plan: Billing Module — Full Implementation

### Database Migration

**New table: `bill_collections`** — stores each bill payment/collection transaction
- `id` (uuid PK), `billing_id` (FK → billing), `client_id` (FK → clients)
- `amount` (numeric), `discount` (numeric default 0), `vat` (numeric default 0)
- `payment_method` (text — Cash, bKash, Nagad, etc.)
- `note` (text), `transaction_id` (text)
- `received_by` (uuid FK → profiles), `approved_by` (uuid FK → profiles), `created_by` (uuid FK → profiles)
- `status` (text default 'approved' — approved/pending/rejected)
- `created_at` (timestamptz)

**Alter `billing` table:**
- Add `vat` (numeric default 0)
- Add `generated` (boolean default false) — whether bill was auto-generated
- Add `branch_id` (uuid FK → branches, nullable)

**Add columns to `clients` (if missing):**
- `speed` (text) — display speed label

### Frontend: Billing List (`BillingList.tsx`)

**Summary Cards (2 rows):**
- Row 1: Paid Client count (green), Unpaid Client count (blue), Received Bill amount (red/orange), Due Amount (purple)
- Row 2: Generated Bill count, Advance Amount, Monthly Bill total

**Bulk Action Buttons:**
- Generate Excel, Generate PDF, Bulk Status Change, Bulk Zone Change, Bulk Billing Date Extend, Download Invoice, Enable/Disable Selected

**Filters:**
- Search (client ID/name/mobile), Zone select, Status select (Paid/Unpaid/Due), Month picker, Package select

**Client Billing Table:**
- Columns: SN, C.Code, ID/IP, Customer Name, Mobile, Zone, Cus.Type, Conn.Type, Package, Speed, Expire Date, M.Bill, Received, VAT, Balance Due, Advance, Payment Date, Server, M.Status (toggle), B.Status (Pay/Due/Paid badge), Action (view/edit/collect)
- Data from `clients` JOIN `billing` (current month)
- Pagination with entries-per-page select

### Frontend: Daily Bill Collection (`DailyCollection.tsx`)

**Tabs:** Collected Bills | Webhook Payments | Paybill Payments

**Summary Cards:** Receive total, Discount total, Due total (for filtered period)

**Action Buttons:** Generate CSV, Generate PDF, + Receive Bill, Approve Selected, Delete Selected

**Filters (2 rows):**
- Username (select), From Date, To Date, Received By
- Approved By, Created By, Trans. Status, Payment Method
- Clear Filter & Apply Filter buttons

**Collection Table:**
- Columns: Date, C.Code, Username, Cus.Name, Mobile, Note/Remarks, M.Bill, Received, VAT, Discount, Balance Due, Payment Method, Received By, Approved By, Created By, Action (approve checkmark)
- Data from `bill_collections` JOIN `clients` JOIN `billing`

**"Receive Bill" Dialog:**
- Client search/select (username/ID dropdown)
- Shows client info + current bill details
- Amount, Discount, Payment Method, Note fields
- On save: insert into `bill_collections`, update `billing.paid`, `billing.status`

### Routing & Sidebar
- Existing routes `/dashboard/billing` and `/dashboard/billing/daily-collection` — just rebuild the page content
- No new routes needed

### Technical Notes
- All queries use `@tanstack/react-query` + Supabase client
- Bill status logic: if paid >= amount → "paid", if paid > 0 → "partial", else "unpaid"
- Summary cards aggregate from `billing` table filtered by current month
- Collection table aggregates from `bill_collections` with date range filter
- Bangla UI labels throughout

