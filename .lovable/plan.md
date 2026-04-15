

## Plan: Bandwidth Customer Portal

### Overview
Build a separate customer-facing portal where bandwidth sale clients can log in (using their `bw_sale_customers` username/password) and view their billing dashboard, invoices, purchase orders, and support tickets — matching the Galaxy Net portal layout.

### What Gets Built

**1. Portal Login Page (`/portal/login`)**
- Split layout: left brand panel (dark), right login form
- Username + Password fields (authenticates against `bw_sale_customers` table)
- Edge function for secure login (validates credentials, returns JWT/session token)

**2. Portal Layout (`PortalLayout.tsx`)**
- Left sidebar: Company name, menu items (Dashboard, Billing Invoices, Purchase Orders, Support Tickets, User Management, Company Settings)
- Top bar: customer name, avatar dropdown
- Main content area

**3. Portal Dashboard (`/portal/dashboard`)**
- Welcome banner with company contact details
- POPCode + LoginID/Username display
- 6 summary cards in 2 rows:
  - Row 1: Balance Due, Last Invoice Info, Payment Due Date
  - Row 2: This Month Paid, Purchase Order Status, Ticket status
- Messages section + Notices section at bottom

**4. Portal Billing Invoices (`/portal/invoices`)**
- Table: Sr. No, Bill No (link), Bill Month, Bill Amount, Paid Amount, Discount, Due, Status (Pay/Due/Paid badges), Action (download)
- Total row at bottom
- Show entries + search + pagination

**5. Portal Purchase Orders (`/portal/purchase-orders`)**
- Same table layout as invoices
- "+ New Order" button
- Table: Sr. No, Bill No, Bill Month, Bill Amount, Paid Amount, Discount, Due, Status, Action

**6. Portal Support Tickets (`/portal/support`)**
- Placeholder for ticket viewing/creation

### Database Changes
- Add `password_hash` column to `bw_sale_customers` (for portal login — currently has plaintext `password` field)
- Or use existing `password` field with an edge function that validates it

### Authentication Approach
- Edge function `portal-auth` that validates username/password against `bw_sale_customers`
- Returns a signed token stored in localStorage
- Portal routes check for valid token via `PortalProtectedRoute` component
- Completely separate from admin Supabase auth

### New Files (8)
- `supabase/functions/portal-auth/index.ts` — Login edge function
- `src/contexts/PortalAuthContext.tsx` — Portal auth state
- `src/components/PortalLayout.tsx` — Sidebar + topbar layout
- `src/components/PortalProtectedRoute.tsx` — Route guard
- `src/pages/portal/PortalLogin.tsx` — Login page
- `src/pages/portal/PortalDashboard.tsx` — Dashboard with 6 cards
- `src/pages/portal/PortalInvoices.tsx` — Invoice list
- `src/pages/portal/PortalPurchaseOrders.tsx` — Purchase orders

### Edited Files (1)
- `src/App.tsx` — Add portal routes under `/portal/*`

### Technical Details
- Portal is fully separate from admin dashboard — different auth, different layout
- Customer data comes from `bw_sale_customers` + `bw_sales_invoices` tables
- Edge function uses service role key to query `bw_sale_customers` securely
- Mobile-responsive: sidebar collapses on mobile, tables scroll horizontally
- Galaxy Net aesthetic: dark sidebar, teal header rows, clean white content area

