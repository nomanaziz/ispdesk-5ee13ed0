

## Plan: Bandwidth Buy Module — Full Implementation

### Database Migration

**Alter `bw_categories`:**
- Add `parent_id` (uuid, self-referencing FK) for sub-categories
- Seed predefined categories: INT, IIG, FNA, GGC, M-CDN, B-CDN, BDIX, NIX, IX, DATA, NTTN

**Alter `bw_providers`:**
- Add `logo_url` (text), `address` (text), `mobile` (text)

**Alter `bw_purchase_bills`:**
- Add `billing_month` (text), `payment_due` (date), `invoice_no` (text), `attachment_url` (text), `discount` (numeric default 0), `remarks` (text)

**New table: `bw_bill_items`** — line items per bill
- `id` (uuid PK), `bill_id` (FK → bw_purchase_bills), `item_id` (FK → bw_items)
- `description` (text), `unit` (text), `quantity` (numeric), `rate` (numeric), `vat_percent` (numeric default 0)
- `from_date` (date), `to_date` (date), `total` (numeric), `created_at`

**Alter `bw_items`:**
- Add `description` (text)

**Storage bucket:** `bw-provider-logos` for provider logo uploads, `bw-bill-attachments` for bill file attachments.

---

### Frontend Pages

**1. Item Categories (`Categories.tsx`)**
- Card-based list with parent categories shown as expandable sections
- Sub-categories listed under parent with indent
- Add/Edit dialog with optional parent_id select
- Edit & Delete buttons per category

**2. Items (`Items.tsx`)**
- Card/table layout grouped by category (not tree view)
- Each category as a collapsible card header showing item count
- Items listed in a clean table within each card
- Add Item dialog: name, category (select), provider (select), bandwidth, price, description
- Edit/Delete inline

**3. Providers (`Providers.tsx`)**
- Table: Logo, Company, Contact Person, Email, Mobile, Balance Due, Actions
- Logo upload via Supabase Storage
- Add/Edit dialog with all fields
- Balance Due calculated from unpaid bills (aggregated query)
- View, Edit, Delete actions

**4. Purchase Bills (`Bills.tsx`)**
- **Summary cards**: Total Purchase, Paid, Due, Discount amounts (current month + all-time)
- **Invoice count cards**: Total, Paid, Due, Unpaid counts
- **Filters**: Month (MM/YYYY), Status select, Provider select
- **Bill table**: SN, Provider, Contact, Bill No, Invoice No, Month, Amount, Paid, Discount, Due, Status (Pay/Due/Paid badges), Actions
- **Add Bill route** (`/dashboard/bw-buy/bills/new`): Form with provider select, auto-generated bill no, billing month, payment due date, invoice no, attachment upload, dynamic line items table (item select, description, unit, qty, rate, VAT%, from/to date, total auto-calc), remarks textarea, total row
- **View Bill route** (`/dashboard/bw-buy/bills/:id`): Invoice-style view matching the reference (provider info header, bill-to section, line items table, totals, payment history, remarks). Download PDF button.

### Routing
- Add routes: `/dashboard/bw-buy/bills/new` and `/dashboard/bw-buy/bills/:id`

### Technical Notes
- All pages use `@tanstack/react-query` + Supabase client
- Bill amounts auto-calculated from line items (quantity * rate + VAT)
- Provider balance due = SUM(bill amounts) - SUM(paid) across all their bills
- Bangla UI labels consistent with existing pages

