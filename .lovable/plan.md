

## Plan: Sales & Invoice Module — Full Implementation

### Overview
Implement the Sales & Service module with full CRUD for Product Invoice and Service Invoice pages. Remove Installation Fee from Sales and move it to the Billing/Client section.

### Database
No migration needed — tables `product_invoices`, `service_invoices`, and `installation_fees` already exist with proper schemas.

### Changes

**1. Product Invoice (`src/pages/dashboard/sales/ProductInvoice.tsx`)**
- Full CRUD table: Invoice No, Client (select from clients), Item (select from inventory_items), Quantity, Unit Price, Total (auto-calc), Date, Status (paid/unpaid/partial)
- Add/Edit dialog, search, date filter, summary cards (total invoices, received, due)
- Bangla UI labels

**2. Service Invoice (`src/pages/dashboard/sales/ServiceInvoice.tsx`)**
- Full CRUD table: Invoice No, Client, Service Name, Amount, Date, Status, Notes
- Add/Edit dialog with client search, status filter
- Summary cards, Bangla labels

**3. Move Installation Fee**
- Remove "Installation Fee" from the "Sales & Service" sidebar group
- Add it under "Billing" sidebar group as "ইনস্টলেশন ফি"
- Keep the route but update sidebar placement
- Implement full CRUD in `InstallationFee.tsx`: Client select, Amount, Paid, Status, Fee Date, Notes

**4. Sidebar (`src/components/AppSidebar.tsx`)**
- Remove Installation Fee from Sales & Service items
- Add Installation Fee item to Billing group

### Files to Edit (4)
- `src/pages/dashboard/sales/ProductInvoice.tsx`
- `src/pages/dashboard/sales/ServiceInvoice.tsx`
- `src/pages/dashboard/sales/InstallationFee.tsx`
- `src/components/AppSidebar.tsx`

