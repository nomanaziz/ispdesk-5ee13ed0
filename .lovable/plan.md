# Employee Portal & Granular Dashboard Permissions

EMP001 এর মত employee login করলে এখন সব menu দেখা যাচ্ছে — কারণ `AppSidebar` এ কোনো role gating নাই। সবার জন্য একটাই sidebar render হচ্ছে। এই plan এ আমরা employee এর জন্য আলাদা portal experience তৈরি করব, এবং admin কে widget/menu level permission control দিব।

---

## 1. Employee Default Experience (Employee role only)

Employee এর fixed primary role `Employee` থাকলে sidebar এ শুধু এই menu গুলা দেখাবে:

- **My Dashboard** (`/dashboard/me`) — personal home
- **My Profile** (`/dashboard/me/profile`) — view/edit (edit → HR approval)
- **My Attendance** (`/dashboard/me/attendance`) — শিফট, in/out, monthly summary
- **My Leave** (`/dashboard/me/leave`) — balance, ছুটির আবেদন
- **My Payslip** (`/dashboard/me/payslip`) — list + PDF download
- **My Salary Advance** (`/dashboard/me/advance`) — অগ্রিম বেতনের আবেদন
- **My Loan** (`/dashboard/me/loan`) — loan আবেদন
- **My Resignation** (`/dashboard/me/resignation`) — resignation আবেদন
- **My Meals** (`/dashboard/me/meals`) — catering daily order
- **My Requisitions** (`/dashboard/me/requisitions`) — product/stationery requisition

## 2. My Dashboard — Top Section (ছবির মত)

স্ক্রিনের একদম উপরে ৪টা widget card:

```text
┌────────────┬────────────┬────────────┬────────────┐
│  Profile   │ This Month │ Attendance │   Leave    │
│  Name+ID   │  Payslip   │ Present/Abs│  Balance   │
│ Department │  ৳XX,XXX   │  XX / XX   │  X days    │
└────────────┴────────────┴────────────┴────────────┘
```

এর নিচে: pending request status (advance/loan/leave), recent payslips, today's meal menu।

## 3. Admin-Granted Extra Widgets (Second Role System)

Admin চাইলে employee কে কিছু admin dashboard widget দেখার permission দিতে পারবে। প্রত্যেক widget এর জন্য আলাদা toggle:

- Today's Sale
- This Month's Sale
- Total Clients
- Active/Inactive Clients
- Billing Summary
- Collection Summary
- Pending Tickets
- Network/OLT Overview
- (extensible)

Employee যদি কোনো widget এ access পায়, তখন তার "My Dashboard" এর নিচে "System Overview" section show হবে, শুধু allowed widget গুলা।

## 4. Extra Module Access (Beyond Widgets)

Employee এর primary `Employee` role lock থাকবে। Admin চাইলে অতিরিক্ত role (Billing, HR, Inventory, CRM) assign করতে পারবে — তখন সেই module এর menu sidebar এ যোগ হবে। এটা আগের architecture এই আছে, শুধু sidebar কে role-aware করতে হবে।

## 5. Catering / Meal System (নতুন module)

**Admin side** (`/dashboard/hr/catering`):
- Catering Services list (নাম, contact, status)
- প্রত্যেক service এর Weekly Menu (Sat→Fri, প্রত্যেক দিনের menu items + price)
- Catering reports (কে কোন দিন কোন service order করেছে, total cost)

**Employee side** (`/dashboard/me/meals`):
- আজকের + আগামীকালের available menu (সব catering থেকে)
- Order করার option, cutoff time এর আগে cancel
- নিজের past orders + total cost this month (salary deduction এ যাবে)

## 6. Profile Edit Approval Workflow

- Employee profile field edit করলে → `profile_change_requests` table এ pending entry।
- HR/Admin এর কাছে approval queue (`/dashboard/hr/profile-approvals`)।
- Approve হলে actual `employees` row update হবে, audit log রাখা হবে।

---

## Technical Notes

### Database (new tables, migration লাগবে)

1. **`dashboard_widget_permissions`** — `(app_user_id, widget_key)` — admin কোন widget allow করেছে
2. **`catering_services`** — `id, name, contact, active`
3. **`catering_weekly_menu`** — `service_id, day_of_week (0-6), items jsonb, price`
4. **`meal_orders`** — `employee_id, service_id, order_date, menu_snapshot, price, status, deducted_in_payroll`
5. **`profile_change_requests`** — `employee_id, changes jsonb, status, reviewed_by, reviewed_at`
6. **`salary_advance_requests`** — `employee_id, amount, reason, status, approved_by`
7. **`loan_requests`** — `employee_id, amount, tenure_months, reason, status`
8. **`resignation_requests`** — `employee_id, effective_date, reason, status`

সব table এ tenant scoped RLS, primary key gen_random_uuid, standard timestamps।

### Frontend

- **`useEmployeeContext` hook** — current logged in `app_user` → linked `employee` row, primary role, extra roles, widget permissions। সব employee page এই hook ব্যবহার করবে।
- **`AppSidebar` refactor** — pure Employee role হলে only "My ..." menu group দেখাবে; extra role থাকলে সেই module গুলা যোগ হবে; admin/super_admin হলে আগের পুরা sidebar।
- **`MyDashboard` page** — 4 fixed widgets উপরে + conditional "System Overview" grid নিচে।
- **Per-widget components** + central registry: `{ key, label, component, defaultAllowedForRoles }`।
- **`WidgetPermissionsTab`** in App Users edit dialog — checkbox list of widget keys।

### Routing

নতুন `me/*` route group, সবগুলা `ProtectedRoute` এর ভিতরে, কিন্তু আলাদা layout ব্যবহার করতে পারে (same `DashboardLayout`, শুধু sidebar যা filter করবে)।

### Out of Scope (পরে)

- Meal cost কে actual payroll cycle এ auto deduct করার logic (এই plan এ schema field রাখব, calculation পরে)
- Loan EMI auto schedule generation
- Mobile-optimized employee shell

---

## Suggested Execution Order

1. Migration: 8 new tables + RLS + GRANTs
2. `useEmployeeContext` + sidebar role-aware refactor
3. `My Dashboard` + 4 top widgets + payslip/attendance/leave pages
4. Profile edit + approval workflow
5. Advance / Loan / Resignation request pages + admin approval queues
6. Catering admin module + employee meal ordering
7. Widget registry + admin permission UI + System Overview section
8. Requisition page (employee side, ties into existing requisition system if present)

প্রত্যেক step আলাদা message এ implement করব যাতে review করা সহজ হয়।