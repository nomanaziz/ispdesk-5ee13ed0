

## ISP Desk ERP -- Full Build Plan

### Architecture Overview

This project will have **two sides** within one codebase:

1. **Frontend (Public Website)** -- The ISP's customer-facing website (like galaxynetbd.com), accessible without login
2. **Backend (Admin ERP)** -- The ISP management dashboard, accessible after login

```text
Route Structure:
/                    --> Public Website (Homepage)
/packages            --> Package listing
/coverage            --> Coverage area checker
/new-connection      --> New connection request form
/about               --> About the ISP
/services            --> Services page
/quick-pay           --> Quick bill payment (public)
/login               --> Admin login
/dashboard           --> ERP Dashboard (protected)
/dashboard/clients   --> Client management (protected)
/dashboard/billing   --> Billing (protected)
/dashboard/hr        --> HR & Payroll (protected)
/dashboard/inventory --> Inventory (protected)
/dashboard/network   --> OLT/ONU/MikroTik (protected)
/dashboard/accounting--> Accounting (protected)
/dashboard/settings  --> Settings (protected)
```

### Phase 1: Public Website (Frontend)

Build the ISP website pages modeled after galaxynetbd.com. Data comes from existing Supabase tables.

**Pages to create:**

| Page | Data Source (existing tables) |
|------|-----|
| Homepage (Hero, Stats, Features, Packages preview, Testimonials, CTA) | `isp_packages`, `zones`, static content |
| `/packages` -- Full package listing | `isp_packages` |
| `/coverage` -- Coverage area search | `zones`, `sub_zones` |
| `/new-connection` -- Connection request form | Inserts into `client_requests` |
| `/services` -- Services offered | Static / configurable |
| `/about` -- About the ISP | Static / configurable |
| `/quick-pay` -- Quick bill payment | `billing`, `clients` (lookup by client_id) |

**Key features:**
- Bangla language support (like the live site)
- Responsive design matching galaxynetbd.com style
- Cache server logos marquee
- Testimonials section
- "How to connect" steps section
- Package cards with pricing in BDT (৳)

**Data flow:**
- Packages shown on website come from `isp_packages` table
- New connection requests insert into `client_requests`
- Quick Pay looks up client by ID, shows billing, processes payment
- HR employees data can feed into a "Our Team" section

### Phase 2: ERP Backend (Admin Dashboard)

Build the protected admin modules. All 85 existing tables are already in Supabase with RLS policies.

**Modules & their existing tables:**

| Module | Tables Used |
|--------|------------|
| **Dashboard** | Aggregates from billing, clients, onu_list |
| **Client Management** | `clients`, `client_requests`, `change_requests`, `client_types`, `zones`, `sub_zones`, `boxes` |
| **Billing** | `billing`, `billing_statuses`, `installation_fees`, `service_invoices`, `product_invoices` |
| **Network Monitoring** | `olt_devices`, `onu_list`, `onu_history`, `mikrotik_devices`, `switches`, `pop_devices`, `pop_logs`, `ping_targets` |
| **HR & Payroll** | `employees`, `departments`, `positions`, `payroll`, `payheads`, `leave_applications`, `leave_categories`, `resignations`, `resign_rules`, `events_holidays` |
| **Inventory** | `inventory_items`, `inventory_categories`, `inventory_units`, `store_locations`, `stock_movements`, `purchases`, `purchase_bills`, `requisitions`, `vendors` |
| **Accounting** | `chart_of_accounts`, `journal_entries`, `expense_entries`, `income_entries` |
| **Bandwidth Mgmt** | `bw_items`, `bw_categories`, `bw_providers`, `bw_purchase_bills`, `bw_sale_pops`, `bw_sales_invoices` |
| **Support** | `support_tickets`, `support_categories`, `tasks`, `task_categories` |
| **SMS** | `sms_gateways`, `sms_templates`, `sms_groups`, `sms_log` |
| **Settings** | `branches`, `branch_managers`, `notification_settings`, `scheduler_config`, `user_roles`, `profiles` |

### Phase 3: Website-ERP Integration

- **HR -> Team page**: Employees from `employees` table shown on public website "Our Team"
- **Packages -> Website**: `isp_packages` data drives the public packages page
- **Quick Pay -> Billing**: Public quick-pay form queries `clients` + `billing`, marks paid
- **Connection Requests**: Public form inserts into `client_requests`, ERP shows pending requests
- **Coverage**: Zones/sub-zones from ERP shown on public coverage page

### Implementation Order

1. **Public website layout & homepage** -- Navbar, Footer, Hero, Features, Package preview, CTA
2. **Public pages** -- /packages, /coverage, /new-connection, /quick-pay
3. **ERP sidebar update** -- Update AppSidebar with all ERP modules
4. **ERP Dashboard** -- Summary cards, charts, recent activity
5. **Client Management module** -- CRUD for clients, requests
6. **Billing module** -- Monthly billing, collections, payment tracking
7. **Network module** -- OLT/ONU/MikroTik views
8. **HR module** -- Employees, payroll, leave
9. **Remaining modules** -- Inventory, Accounting, Support, SMS, Settings

### Technical Details

- **No database changes needed** -- All 85 tables with RLS already exist
- **Routing**: Update `App.tsx` to add public routes (no auth) + protected `/dashboard/*` routes
- **ProtectedRoute**: Fix redirect from `/landing` to `/login`
- **Public pages**: New layout component (PublicLayout) with ISP-branded navbar/footer
- **Supabase queries**: Use existing `supabase` client; tables are already in the types
- **Bangla i18n**: Hardcoded Bangla strings for the public site (matching galaxynetbd.com pattern)
- **Theme**: Public site uses its own branded theme; ERP uses the existing dark sidebar theme

### Files to Create/Modify

- `src/components/PublicLayout.tsx` -- Public website shell (navbar + footer)
- `src/pages/public/Home.tsx` -- Homepage
- `src/pages/public/Packages.tsx` -- Package listing
- `src/pages/public/Coverage.tsx` -- Coverage checker
- `src/pages/public/NewConnection.tsx` -- Connection request form
- `src/pages/public/QuickPay.tsx` -- Quick payment
- `src/pages/public/About.tsx` -- About page
- `src/pages/public/Services.tsx` -- Services page
- `src/pages/dashboard/*` -- All ERP module pages
- `src/App.tsx` -- Add all routes
- `src/components/AppSidebar.tsx` -- Update with full ERP menu
- `src/components/ProtectedRoute.tsx` -- Fix redirect to `/login`

