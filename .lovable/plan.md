

## Complete ERP Page Creation Plan

Based on exploring your live portal at portal.galaxynetbd.com, I've mapped every single page. Here is the full list of **120+ pages** to create as placeholder pages (UI only, no logic yet -- you'll tell me the logic later).

### Complete Page Map from Your Portal

| # | Module | Sub-pages | Route |
|---|--------|-----------|-------|
| 1 | **Dashboard** | Overview | `/dashboard` (exists) |
| | **Configuration** | | |
| 2 | | Zone | `/dashboard/config/zones` |
| 3 | | Sub Zone | `/dashboard/config/sub-zones` |
| 4 | | Box | `/dashboard/config/boxes` |
| 5 | | Connection Type | `/dashboard/config/connection-types` |
| 6 | | Client Type | `/dashboard/config/client-types` |
| 7 | | Protocol Type | `/dashboard/config/protocol-types` |
| 8 | | Billing Status | `/dashboard/config/billing-statuses` |
| 9 | | Package | `/dashboard/config/packages` |
| 10 | | District | `/dashboard/config/districts` |
| 11 | | Upazila | `/dashboard/config/upazilas` |
| | **VAS** | | |
| 12 | | VAS Config | `/dashboard/vas/config` |
| 13 | | Transaction History | `/dashboard/vas/transactions` |
| | **Client** | | |
| 14 | | New Request | `/dashboard/clients/new-request` |
| 15 | | Add New | `/dashboard/clients/add` |
| 16 | | Client List | `/dashboard/clients` |
| 17 | | Left Client | `/dashboard/clients/left` |
| 18 | | Scheduler | `/dashboard/clients/scheduler` |
| 19 | | Change Request | `/dashboard/clients/change-request` |
| 20 | | Portal Manage | `/dashboard/clients/portal-manage` |
| | **Billing** | | |
| 21 | | Billing List | `/dashboard/billing` |
| 22 | | Daily Bill Collection | `/dashboard/billing/daily-collection` |
| | **Mikrotik Server** | | |
| 23 | | Server | `/dashboard/mikrotik/servers` |
| 24 | | Server Backup | `/dashboard/mikrotik/backup` |
| 25 | | Import From Mikrotik | `/dashboard/mikrotik/import` |
| 26 | | Bulk Clients Import | `/dashboard/mikrotik/bulk-import` |
| | **HR & Payroll** | | |
| 27 | | Department | `/dashboard/hr/departments` |
| 28 | | Payhead | `/dashboard/hr/payheads` |
| 29 | | Payroll | `/dashboard/hr/payroll` |
| 30 | | Position | `/dashboard/hr/positions` |
| 31 | | Payslip | `/dashboard/hr/payslip` |
| 32 | | Add Employee | `/dashboard/hr/employees/add` |
| 33 | | Employee List | `/dashboard/hr/employees` |
| 34 | | Salary Sheet | `/dashboard/hr/salary-sheet` |
| 35 | | Resign Rule | `/dashboard/hr/resign-rules` |
| 36 | | Resignation | `/dashboard/hr/resignations` |
| 37 | | Rejoin | `/dashboard/hr/rejoin` |
| 38 | | Attendance | `/dashboard/hr/attendance` |
| | **OLT Management** | | |
| 39 | | OLT | `/dashboard/olt` |
| 40 | | OLT Users | `/dashboard/olt/users` |
| | **Network Diagram** | | |
| 41 | | Diagram | `/dashboard/network/diagram` |
| 42 | | Network POP | `/dashboard/network/pop` |
| 43 | | Clients in Diagram | `/dashboard/network/clients` |
| 44 | | Network Connections | `/dashboard/network/connections` |
| 45 | | Distributed Inv. Items | `/dashboard/network/distributed-items` |
| 46 | | Network View in Map | `/dashboard/network/map` |
| | **Leave Management** | | |
| 47 | | Category | `/dashboard/leave/categories` |
| 48 | | Setup | `/dashboard/leave/setup` |
| 49 | | Apply | `/dashboard/leave/apply` |
| 50 | | Approval | `/dashboard/leave/approval` |
| | **Branch Office** | | |
| 51 | | Package | `/dashboard/branches/packages` |
| 52 | | Tariff Config | `/dashboard/branches/tariff` |
| 53 | | Add Branch Manager | `/dashboard/branches/add-manager` |
| 54 | | Branch Managers List | `/dashboard/branches/managers` |
| 55 | | Branch Funding | `/dashboard/branches/funding` |
| 56 | | Client PGW Payments | `/dashboard/branches/pgw-payments` |
| 57 | | PGW Transaction Settlement | `/dashboard/branches/pgw-settlement` |
| 58 | | POP Notice | `/dashboard/branches/pop-notice` |
| | **Events & Holidays** | | |
| 59 | | Index | `/dashboard/events` |
| | **Support & Ticketing** | | |
| 60 | | Support Category | `/dashboard/support/categories` |
| 61 | | Client Support | `/dashboard/support/tickets` |
| 62 | | Support History | `/dashboard/support/history` |
| | **Task Management** | | |
| 63 | | Task Category | `/dashboard/tasks/categories` |
| 64 | | Task | `/dashboard/tasks` |
| 65 | | Task History | `/dashboard/tasks/history` |
| | **Bandwidth Buy** | | |
| 66 | | Item | `/dashboard/bw-buy/items` |
| 67 | | Item Category | `/dashboard/bw-buy/categories` |
| 68 | | Provider | `/dashboard/bw-buy/providers` |
| 69 | | Purchase Bill | `/dashboard/bw-buy/bills` |
| | **Bandwidth Sale** | | |
| 70 | | POP | `/dashboard/bw-sale/pop` |
| 71 | | Sales Invoice | `/dashboard/bw-sale/invoices` |
| 72 | | Bill Collection | `/dashboard/bw-sale/collection` |
| 73 | | Recurring Invoice | `/dashboard/bw-sale/recurring` |
| | **Purchase** | | |
| 74 | | Vendor | `/dashboard/purchases/vendors` |
| 75 | | Requisition | `/dashboard/purchases/requisitions` |
| 76 | | Purchase | `/dashboard/purchases` |
| 77 | | Purchase Bill | `/dashboard/purchases/bills` |
| | **Sales & Service** | | |
| 78 | | Product Invoice | `/dashboard/sales/product-invoice` |
| 79 | | Service Invoice | `/dashboard/sales/service-invoice` |
| 80 | | Installation Fee | `/dashboard/sales/installation-fee` |
| | **Inventory** | | |
| 81 | | Unit | `/dashboard/inventory/units` |
| 82 | | Store Location | `/dashboard/inventory/locations` |
| 83 | | Item Category | `/dashboard/inventory/categories` |
| 84 | | Item | `/dashboard/inventory/items` |
| 85 | | Stock | `/dashboard/inventory/stock` |
| | **Assets** | | |
| 86 | | Asset List | `/dashboard/assets` |
| 87 | | Destroyed Items | `/dashboard/assets/destroyed` |
| | **Accounting** | | |
| 88 | | Accounting Dashboard | `/dashboard/accounting` |
| 89 | | Chart of Accounts | `/dashboard/accounting/chart` |
| 90 | | Income | `/dashboard/accounting/income` |
| 91 | | Expense | `/dashboard/accounting/expense` |
| 92 | | Journal | `/dashboard/accounting/journal` |
| 93 | | Accounting Transactions | `/dashboard/accounting/transactions` |
| 94 | | Account Balances | `/dashboard/accounting/balances` |
| 95 | | Balance Sheet | `/dashboard/accounting/balance-sheet` |
| 96 | | Profit Loss | `/dashboard/accounting/profit-loss` |
| 97 | | Compare Profit Loss | `/dashboard/accounting/compare-pl` |
| 98 | | Trial Balance | `/dashboard/accounting/trial-balance` |
| 99 | | Cash Book | `/dashboard/accounting/cash-book` |
| | **Report** | | |
| 100 | | Bill Collection | `/dashboard/reports/bill-collection` |
| 101 | | Discount Report | `/dashboard/reports/discount` |
| 102 | | Customer Report | `/dashboard/reports/customer` |
| 103 | | Messages Report | `/dashboard/reports/messages` |
| 104 | | Due Customer SMS | `/dashboard/reports/due-sms` |
| 105 | | Pay. Processing Fee | `/dashboard/reports/processing-fee` |
| 106 | | BTRC Monthly Report | `/dashboard/reports/btrc` |
| 107 | | Financial Transactions | `/dashboard/reports/financial` |
| | **SMS Service** | | |
| 108 | | Individual SMS | `/dashboard/sms/individual` |
| 109 | | SMS Template | `/dashboard/sms/templates` |
| 110 | | SMS Group | `/dashboard/sms/groups` |
| 111 | | Send SMS | `/dashboard/sms/send` |
| 112 | | SMS Gateway | `/dashboard/sms/gateway` |
| | **Affiliation** | | |
| 113 | | Affiliate Partners | `/dashboard/affiliation/partners` |
| 114 | | Add Affiliator | `/dashboard/affiliation/add` |
| | **System** | | |
| 115 | | App Users | `/dashboard/system/users` |
| 116 | | Company SetUp | `/dashboard/system/company` |
| 117 | | Invoice SetUp | `/dashboard/system/invoice` |
| 118 | | Periods SetUp | `/dashboard/system/periods` |
| 119 | | Payment Gateways | `/dashboard/system/payment-gateways` |
| 120 | | EMail SetUp | `/dashboard/system/email` |
| 121 | | System SetUp | `/dashboard/system/setup` |
| 122 | | P. Processing Fee | `/dashboard/system/processing-fee` |

### Implementation Approach

1. **Update `AppSidebar.tsx`** -- Replace current menu groups with the exact 22 module groups from the portal
2. **Create placeholder page components** -- Each page gets a simple component with the page title, breadcrumb, and a "Coming soon" card
3. **Create a reusable `PlaceholderPage` component** -- To avoid 120 separate files, use a shared component that accepts title/description
4. **Update `App.tsx`** -- Register all 122 routes under `/dashboard/*`, all wrapped in `ProtectedRoute`
5. **Group page files by module** -- e.g., `src/pages/dashboard/hr/`, `src/pages/dashboard/billing/`, etc.

### Technical Details

- Each page file will be a simple React component importing the shared `PlaceholderPage`
- All routes will be protected via the existing `P` wrapper
- Sidebar will match the exact portal structure with all 22 groups and their sub-items
- No logic/data fetching in this phase -- just page shells ready for you to specify logic later

