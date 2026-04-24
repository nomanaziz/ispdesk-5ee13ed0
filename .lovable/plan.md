# Pre-defined Employee Roles তৈরি

আপনার চাহিদা অনুযায়ী ৪টা নতুন role তৈরি করব। প্রত্যেকটা role-এ relevant module গুলো `enabled = true` করে appropriate permission level (view/edit/delete) সহ pre-configure করা থাকবে। পরে আপনি `/dashboard/access/roles` থেকে যেকোনো সময় এগুলো customize করতে পারবেন।

## যে Role গুলো তৈরি হবে

### 1. Support Engineer
Client নিয়ে main কাজ করবে — monitoring, ticket, task assign।

**Edit access:**
- DASHBOARD → Dashboard
- CLIENTS → Client List, Add Client, Portal Manage, Scheduler
- MONITORING → Online Clients, Live Traffic, POP Devices
- BW_SALE → Customers, Invoices, Collections (reseller/bandwidth client সব)
- BILLING → Client Profile, Billing List
- COMMON_PERMISSIONS → Create, Edit, View, Print

**View only:**
- REPORTS → Customer, Bill Collection, Messages
- NETWORK → Map, Diagram, Connections
- OLT → ONU List, Users
- HR_PAYROLL → Employees (অন্য employee দের assign করার জন্য)

### 2. Accountant
Billing/accounting এর সব কাজ pre-defined access।

**Edit access:**
- DASHBOARD → Dashboard
- ACCOUNTING → সবগুলা (Cash Book, Journal, Income, Expense, Chart of Accounts, Balance Sheet, P&L, Trial Balance)
- BILLING → Billing List, Daily Collection, Client Profile
- BW_SALE → Invoices, Collections, Recurring
- BW_BUY → Bills, Subscriptions
- SALES → Installation Fee, Product Invoice, Service Invoice
- PURCHASES → Bills, Purchases, Vendors, Requisitions
- BRANCHES → Funding, PGW Payments, PGW Settlement
- COMMON_PERMISSIONS → Create, Edit, View, Print, Export

**View only:**
- REPORTS → Bill Collection, Financial, Discount, Processing Fee, BTRC, Customer
- CLIENTS → Client List
- SHOP → Sales Report, Orders

### 3. Technician
যে ticket/task assign হবে সেগুলা solve করবে, নতুন client install করতে পারবে।

**Edit access:**
- DASHBOARD → Dashboard
- CLIENTS → Add Client, Client List, Scheduler (নিজে account খুলতে পারবে)
- MONITORING → Online Clients, POP Devices
- NETWORK → Map, Connections, POP
- OLT → ONU List, Users
- INVENTORY → Items, Stock (parts ব্যবহার করার জন্য)
- COMMON_PERMISSIONS → Create, Edit, View

**View only:**
- BILLING → Client Profile
- NETWORK → Diagram
- MIKROTIK → Servers
- HR_PAYROLL → Attendance (নিজের attendance)

### 4. Transmission Engineer
Backbone/transmission/OLT/MikroTik device management।

**Edit access:**
- DASHBOARD → Dashboard
- MONITORING → Live Traffic, POP Devices, Online Clients
- NETWORK → POP, Map, Diagram, Connections
- OLT → Devices, ONU List, Sharing, Users
- MIKROTIK → Servers, Backup, Import
- BW_BUY → Providers, Subscriptions (upstream link)
- COMMON_PERMISSIONS → Create, Edit, View

**View only:**
- CLIENTS → Client List
- BILLING → Client Profile
- REPORTS → BTRC

## Technical Implementation

1. **Database insert** — `app_roles` table-এ ৪টা নতুন row insert (`is_protected=false`, `is_default=false`, `status='Active'`, `redirect_url='/dashboard'`)। ফলে user চাইলে delete/edit করতে পারবে।

2. **Module seeding** — প্রত্যেক নতুন role-এর জন্য `app_role_modules` table-এ সব module group/module name combination insert করা হবে, কিন্তু শুধু উপরের list-এ থাকা module গুলোর `enabled = true` ও appropriate `permission` (view/edit) হবে। বাকিগুলা `enabled = false, permission='view'`।

3. **Permission mapping** — উপরে "Edit access" = `permission='edit'`, "View only" = `permission='view'`। কোনো role-এ default delete দেওয়া হবে না (security-এর জন্য) — দরকার হলে আপনি পরে turn on করবেন।

4. **Idempotent SQL** — যদি একই নামের role আগে থেকে থাকে তবে duplicate insert হবে না (`ON CONFLICT DO NOTHING` বা existence check)।

## Files / Areas Touched
- শুধু database migration (data insert)। কোনো frontend code change লাগবে না — `AppRoles.tsx` page automatically নতুন role গুলো dropdown-এ দেখাবে।

## Approval-এর পর
Approve করলে migration চালিয়ে role গুলো তৈরি করব। তারপর `/dashboard/access/roles` page-এ গিয়ে প্রত্যেকটা role select করে আপনি দেখতে পাবেন কোন module enabled আছে — এবং সেখান থেকেই পরে fine-tune করতে পারবেন।
