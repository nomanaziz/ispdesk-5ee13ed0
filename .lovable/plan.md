

## Plan: Purchase Module — Full Page Implementation

### Overview
Implement all 4 purchase pages (currently placeholders) with full CRUD UI and Supabase integration. No database changes needed — all tables (`vendors`, `purchases`, `requisitions`, `purchase_bills`) already exist.

### Pages to Implement

**1. Vendors (`Vendors.tsx`)** — ভেন্ডর ম্যানেজমেন্ট
- "+ Add Vendor" dialog: Name, Contact, Email, Address, Status (active/inactive)
- Summary cards: Total Vendors, Active, Inactive
- Table: Serial, Name, Contact, Email, Address, Status (badge), Created Date, Actions (edit/delete)
- Search filter

**2. Requisitions (`Requisitions.tsx`)** — রিকুইজিশন
- "+ New Requisition" dialog: Requisition No, Item (select from inventory_items), Quantity, Vendor (select), Estimated Cost, Notes
- Summary cards: Total, Pending, Approved, Rejected
- Filters: Status, Vendor, Search
- Table: Serial, Requisition No, Item Name, Quantity, Vendor, Estimated Cost, Status (pending/approved/rejected badge), Approved By, Notes, Created Date, Actions (edit/approve/reject/delete)
- Status update actions for approve/reject

**3. Purchases (`Purchases.tsx`)** — ক্রয় তালিকা
- "+ New Purchase" dialog: Purchase No, Vendor (select), Item (select from inventory_items), Quantity, Unit Price, Total (auto-calc), Purchase Date, Status, Notes
- Summary cards: Total Purchases, Total Amount, Completed, Pending
- Filters: Status, Vendor, Date Range, Search
- Table: Serial, Purchase No, Vendor, Item, Quantity, Unit Price, Total, Purchase Date, Status (badge), Notes, Actions (edit/delete)

**4. Purchase Bills (`PurchaseBills.tsx`)** — পার্চেজ বিল
- Same pattern as existing `bw-buy/Bills.tsx` but for general purchases
- "+ New Bill" dialog: Bill No, Vendor (select), Amount, Paid, Due (auto-calc), Bill Date, Status
- Summary cards: Total Amount, Total Paid, Total Due
- Filters: Status, Vendor, Search
- Table: Serial, Vendor, Bill No, Amount, Paid, Due, Bill Date, Status (badge), Actions (edit/delete)

### Technical Details
- All queries via `@tanstack/react-query` + Supabase
- Vendors dropdown shared across Requisitions, Purchases, Purchase Bills
- Items dropdown from `inventory_items` table for Requisitions and Purchases
- Bangla UI labels throughout
- No database migration needed — all tables exist

