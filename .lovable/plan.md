

## Plan: Cross-links, Dashboard Sub-tabs, and Full Widget Dashboard

### 1. Cross-links between Frontend and Backend

**Public Navbar** (`src/components/public/PublicNavbar.tsx`):
- For logged-in users, show a "ড্যাশবোর্ড" button linking to `/dashboard` (instead of or alongside the "লগইন" button)
- Use `useAuth()` to detect login state

**Dashboard TopBar** (`src/components/TopBar.tsx`):
- Add a "Visit Website" link (icon + text) pointing to `/` so admins can jump to the public site
- Fix the broken Profile link (currently `/admin` which doesn't exist)

### 2. Dashboard with Two Sub-Overview Tabs

**Sidebar update** (`src/components/AppSidebar.tsx`):
- Under "Dashboard" group, change from single "Overview" to two items:
  - "Billing Overview" → `/dashboard` (default)
  - "OLT Overview" → `/dashboard/olt-overview`

**New page**: `src/pages/dashboard/OltOverview.tsx`
- Placeholder page for OLT/ONU status overview

**Route update** (`src/App.tsx`):
- Add route for `/dashboard/olt-overview`

### 3. Full Billing Dashboard Widgets (from portal.galaxynetbd.com)

Rebuild `src/pages/Dashboard.tsx` with ALL widgets seen on the portal. The complete widget list:

**Row 1 — Client Summary (4 cards)**:
- Total Client | Running Clients | Inactive Clients | Waiver Clients

**Row 2 — Monthly Client Activity (4 cards)**:
- New Client | Renewed Clients | Deactivated Clients | Left Clients

**Row 3 — Billing Status (4 cards)**:
- Billing Clients | Paid Clients | Partially Paid | Unpaid Clients

**Row 4 — Network Status (4 cards)**:
- Online Clients | Blocked Clients | Bill Date Expire | Unpaid Extension

**Row 5 — POP Status (4 cards)**:
- Total POPs | Total POP Clients | Enabled POP Clients | Disabled POP Clients

**Row 6 — Support & Tasks (4 cards)**:
- Pending Tickets | Processing Tickets | Pending Task | Processing Task

**Row 7 — Charts (2 side-by-side)**:
- Zone Wise Problem Occurrence (Doughnut chart)
- Sub-Zone Wise Problem Occurrence (Doughnut chart)

**Row 8 — Monthly Problem Occurrence (Pie chart)**

**Row 9 — Charts (2 side-by-side)**:
- Most Problem Solver (Bar chart)
- Monthly New Client (Bar chart)

**Row 10 — Chart + Table**:
- Company Performance / Active Client (Bar chart, 12 months)
- Top 20 Unpaid Client (Table: User Name, Mobile, Bill Amount, Due Amount)

**Row 11 — Financial Summary (4 cards)**:
- Monthly Bill | Collected Bill | Discount | Total Due

**Row 12 — Sales & Income (4 cards)**:
- Service Sales Invoice | Product Sales Invoice | Income | Expense

**Row 13 — POP Financials (4 cards)**:
- Credited Amount | POP Fund | POP Bill | Receivable Amount

**Row 14 — Bandwidth & Salary (4 cards)**:
- B.Width Provider Bill | B.Width Provider Due | B.Width POP Bill | Paid Salary

**Row 15 — SMS & Purchase (4 cards)**:
- SMS Balance | Purchase Payable Due | Purchase Paid Amount | Cash On Hand

### Technical Details

**Data fetching**: Single `useStats` hook querying:
- `clients` table (counts by status: active/inactive/left/waiver/deactivated)
- `billing` table (monthly totals, paid/unpaid/partial counts)
- `onu_list` table (online/blocked counts)
- `support_tickets` table (pending/processing counts)
- `tasks` table (pending/processing counts)
- `pop` / `pop_clients` tables (POP counts)
- `accounting_transactions` (income/expense/cash)
- `bandwidth_bills`, `purchase_bills`, `salary` tables
- `client_requests` (monthly new clients chart data)

**Charts**: Use existing `recharts` via `src/components/ui/chart.tsx` (already installed)

**Files to create/edit**:
- Edit `src/components/public/PublicNavbar.tsx` — add dashboard link for logged-in users
- Edit `src/components/TopBar.tsx` — add "Visit Website" link, fix profile link
- Edit `src/components/AppSidebar.tsx` — split Dashboard into 2 sub-items
- Edit `src/pages/Dashboard.tsx` — complete rebuild with all widgets
- Create `src/pages/dashboard/OltOverview.tsx` — OLT/ONU overview placeholder
- Edit `src/App.tsx` — add OLT overview route

