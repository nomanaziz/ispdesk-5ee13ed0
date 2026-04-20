

## লক্ষ্য
MAC Reseller Portal-কে একটা পূর্ণাঙ্গ ISP Reseller Management Panel-এ রূপান্তর করা — আপনার পাঠানো GALAXY NET screenshot-এর মতো। বর্তমান reseller portal-এ শুধু **৭টা মেনু** আছে (Dashboard, MikroTik Users, Invoices, Purchases, Tickets, Users, Settings) — এটাকে সম্প্রসারিত করে নিচের সম্পূর্ণ structure বানাবো।

## চূড়ান্ত Sidebar Structure (নতুন)

```
GALAXY NET / [POP NAME]
├── 🏠 Dashboard
├── ⚙️ Configuration
│   ├── Zone (নিজে create করতে পারবে)
│   ├── Sub Zone
│   ├── Box
│   ├── Package (নিজস্ব tariff থেকে derived)
│   ├── District       (read-only, admin allotted)
│   ├── Upazila        (read-only, admin allotted)
│   ├── Department     (নিজে create)
│   ├── Designation    (নিজে create)
│   └── Device
├── 🖥️ MikroTik Client       (admin export → এই POP)
├── 👥 Employee
│   ├── Add Employee
│   ├── Employee List
│   ├── Salary Sheet
│   ├── Payroll
│   └── Attendance
├── 👤 Client
│   ├── Add Client
│   ├── Client List (Active)
│   ├── Billing Client
│   ├── Left Clients
│   └── Scheduler
├── 💰 Billing
│   ├── Billing List
│   ├── Invoice
│   ├── Daily Collection
│   └── Client Bill Profile
├── 📡 Monitoring
│   ├── Online Client Monitoring
│   ├── Client Support (Ticket)
│   └── Ping Tools
├── 💬 SMS Service
│   ├── Templates
│   ├── Individual / Group
│   ├── Send SMS
│   └── Gateway
├── 📊 Reports
│   ├── Bill Collection
│   ├── Enable/Disable History
│   ├── Messages
│   ├── Processing Fee
│   ├── Discount
│   └── Due SMS
├── 🛒 Purchase Orders
├── ⚙️ System
│   ├── Settings (Company)
│   ├── Period (Bill generate date)
│   └── Users (Sub-users)
└── 📒 Fund History
    ├── Debit History
    └── Credit History
```

## Dashboard Card Layout (Screenshot অনুযায়ী)

**Row 1 — Company-level (Main company-র সাথে সম্পর্ক):**
| Card | মান |
|---|---|
| 📧 SMS Balance | reseller.sms_balance |
| 💰 Remaining Balance | branch_managers.balance |
| 💵 Daily Charged | (daily prorate × active client count) |
| 🧾 Approximate Rechargeable | daily × মাসের বাকি দিন |
| 📅 Monthly Charged | চলতি মাসের total billed |
| 💳 Monthly Payment | চলতি মাসের collected |
| 🎁 Monthly Discount | discount sum |
| ⚠️ Balance Due | due (admin add type অনুযায়ী) |

**Row 2 — Internal company info:**
- Zone-wise / Sub-Zone-wise problem chart
- Total Online Clients
- Monthly New Client (bar chart)
- Company Performance (active client trend)
- Top 20 unpaid clients
- New Client / Total Client / Monthly Bill / Collected / Discount / Total Due / Cash on Hand / Paid Salary

## কী কী নতুন বানাবো (Pages)

বেশিরভাগ page-ই dashboard ERP-তে already আছে — সেগুলোকে **POP-scoped wrapper** দিয়ে reseller portal-এ pull করব। প্রতিটিতে `branch_id = current POP's branch_id` filter বসবে।

### New Reseller Pages (`src/pages/reseller/`)
1. **ResellerDashboard.tsx** — সম্পূর্ণ rewrite, screenshot-এর মতো 16-card + 5-chart layout
2. **ResellerConfig/Zones.tsx, SubZones.tsx, Boxes.tsx, Packages.tsx, Devices.tsx** — POP-scoped CRUD
3. **ResellerConfig/Districts.tsx, Upazilas.tsx** — read-only (admin যা assign করেছে)
4. **ResellerConfig/Departments.tsx, Designations.tsx** — POP-scoped
5. **ResellerEmployees/** — AddEmployee, List, SalarySheet, Payroll, Attendance (filter by branch_id)
6. **ResellerClients/** — Add, List, Billing, Left, Scheduler (branch_id filter)
7. **ResellerBilling/** — List, Invoice, DailyCollection, ClientProfile
8. **ResellerMonitoring/** — OnlineClients, Tickets, Ping
9. **ResellerSms/** — Templates, Individual, Group, Send, Gateway
10. **ResellerReports/** — 6টা report POP-scoped
11. **ResellerSystem/Period.tsx** — bill generate date setting (per-POP)
12. **ResellerFundHistory.tsx** — Debit/Credit tabs (`branch_funding` table)

### সব নতুন page-এ common pattern
```tsx
const popId = customer?.type === "reseller_sub" ? customer?.parent_reseller_id : customer?.sub;
const branchId = pop?.branch_id;
// সব query: .eq("branch_id", branchId)
```

## DB পরিবর্তন

### নতুন table — `pop_district_assignments`
```sql
create table pop_district_assignments (
  id uuid pk default gen_random_uuid(),
  branch_manager_id uuid → branch_managers(id),
  district_id uuid → districts(id),
  upazila_ids uuid[],   -- বা NULL = সব উপজেলা
  created_at timestamptz default now()
);
```
Admin এই table-এ row insert করে কোন POP কোন district/upazila-এ ব্যবসা করতে পারবে সেটা allot করবে। POP portal-এ এই table থেকেই districts/upazilas dropdown ভরবে।

### নতুন table — `pop_billing_periods`
```sql
create table pop_billing_periods (
  branch_manager_id uuid pk → branch_managers(id),
  period_type text default 'monthly',     -- monthly | date_to_date
  generate_day smallint default 1,        -- মাসের কত তারিখ
  due_days smallint default 7
);
```

### `bw_reseller_users.permissions` extension
নতুন menu গুলোর জন্য permissions object বাড়াতে হবে:
```ts
{ dashboard, configuration, mikrotik, employee, client, billing,
  monitoring, sms, reports, purchases, tickets, system, fund_history }
```

### Admin-side নতুন page
**`src/pages/dashboard/branches/PopDistrictAllotment.tsx`** — POP edit screen-এ নতুন tab "District/Upazila Permission" যেখানে admin checkbox দিয়ে allot করবে।

## Sub-user Permission (Employee add করার সময়)
Reseller যখন employee/sub-user create করবে — দুটো mode:
- **Permission সহ**: select-able permissions tree (configuration, client, billing ইত্যাদি)। Sub-user login করলে শুধু allowed menu দেখবে।
- **Permission ছাড়া**: শুধু "Employee record" — login দিতে পারবে না (portal_enabled=false), HR record হিসেবে থাকবে।

UI-তে toggle: `[ ] এই employee-কে portal access দিন`

## Routing (App.tsx)
নতুন ~৪০টি route যোগ হবে `/reseller/*` namespace-এ। সব route-এ `ResellerProtectedRoute require="<menu_key>"` দিয়ে gated থাকবে।

## কাজের ক্রম (Implementation Phases)

**Phase 1 — Foundation (এই sprint-এ):**
1. ResellerLayout sidebar-এ পূর্ণ menu structure (collapsible groups)
2. Dashboard rewrite — 16 card + চার্টসমূহ
3. DB migration: `pop_district_assignments`, `pop_billing_periods`
4. Configuration group — Zones, Sub-zones, Boxes, Packages, Departments, Designations, Devices (POP-scoped CRUD)
5. Districts/Upazilas read-only views

**Phase 2 — Operations:**
6. Client module (Add/List/Billing/Left/Scheduler) POP-scoped
7. Employee module (Add/List/Attendance/Payroll)
8. Billing module (List/Invoice/DailyCollection)

**Phase 3 — Engagement:**
9. Monitoring (Online clients, Ping)
10. SMS service (5 sub-pages)
11. Reports (6 reports, branch_id filter)

**Phase 4 — Admin & Settings:**
12. Fund History (Debit/Credit)
13. System → Period setting
14. Sub-user permission tree extension
15. Admin POP edit-এ District allotment tab

## কী **হবে না**
- ERP admin module-গুলো delete হবে না — নতুন reseller wrapper page বানিয়ে data filter করব
- Existing ৭টি reseller route ভাঙবে না — backward compatible থাকবে
- Reseller কখনো admin/অন্য POP-এর data দেখবে না — সর্বত্র `branch_id` filter বাধ্যতামূলক

## File সংখ্যা (আনুমানিক)
- নতুন reseller page: **~৩৫টা**
- Modify: ResellerLayout, App.tsx, ResellerProtectedRoute, PortalAuthContext (permissions extend), portal-auth edge function
- নতুন migration: ২টা table + ১টা admin allotment UI
- মোট edited/new: **~৪৫ file** (বড় কাজ — Phase ১ approve করলে শুরু করব, পরে phase by phase)

## আপনাকে decide করতে হবে
এত বড় scope একসাথে করলে একটা message-এ ৫০+ file edit হবে — সাধারণত ভেঙে করা ভালো। আমার suggestion:

**এখন Phase 1 শুরু করি** (Sidebar restructure + Dashboard + Config CRUD + DB migrations) → test করুন → তারপর Phase 2 শুরু করব।

approve করলে Phase 1 implement করব।

