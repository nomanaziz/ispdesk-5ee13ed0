# Add Employee Self-Service Modules to Roles & Permissions

বর্তমানে `HR_PAYROLL` group-এ শুধু admin-facing modules (Employees, Attendance, Payroll, Payslip, Departments, Positions, Salary Sheet) আছে। Employee role-এর জন্য self-service modules নেই, তাই /dashboard/access/roles পেইজে Employee role-এ তার নিজের সুবিধা দেখার option add করা যাচ্ছে না।

## নতুন Module Group: `EMPLOYEE_SELF_SERVICE`

`app_role_modules` table-এ নিচের modules add করব (প্রতি role এর জন্য row, default `enabled=false`, `permission='view'`):

| Module Name | উদ্দেশ্য |
|---|---|
| My Profile | নিজের employee profile দেখা |
| My Attendance | নিজের attendance log + status |
| Daily Attendance Report | আজকের attendance summary |
| Monthly Attendance Report | মাসিক report + present/absent/late |
| My Leave Balance | Sick / Casual / Paid / Earned leave বাকি ও used |
| Apply Leave | Leave application submit |
| My Leave History | আগের সব leave + status |
| My Facilities | Food allowance, accommodation, conveyance ইত্যাদি assigned facilities |
| My Payslip | নিজের payslip download |
| My Conveyance | Conveyance bill submit (existing page) |
| Lunch Order | Catering থেকে lunch/food order |
| Catering Service | (Admin/HR) Catering vendor setup, menu, pricing |

Employee role-এ default-enabled: My Profile, My Attendance, Daily/Monthly Attendance Report, My Leave Balance, Apply Leave, My Leave History, My Facilities, My Payslip, My Conveyance, Lunch Order.

Admin/Super Admin role-এ সব enable, plus Catering Service।

## পরিবর্তন

### 1. Database migration
- `app_role_modules`-এ উপরের ১২টি module row insert করা প্রতিটি existing role-এর জন্য (group=`EMPLOYEE_SELF_SERVICE`)
- Default: super_admin/admin সব enabled; employee role-এ self-service items enabled; অন্যান্য role disabled
- Idempotent: `ON CONFLICT DO NOTHING` (module_group + module_name + role_id unique ধরে)

### 2. AppRoles.tsx (UI)
- নতুন group automatically render হবে (existing grouping logic দিয়ে), আলাদা code change লাগবে না
- শুধু group display order ঠিক রাখতে চাইলে `module_group` ordering-এ `EMPLOYEE_SELF_SERVICE` HR_PAYROLL-এর পরে দেখাবে

### 3. Sidebar + Routes (পরের ধাপে, এই plan-এর scope-এ নয়)
- এই migration-এর পর শুধু permission keys থাকবে। আসল pages (Lunch Order, Catering Service, My Leave ইত্যাদি) যেগুলো এখনো নেই, সেগুলো পরের build phase-এ আলাদা করে করব। এখন শুধু role/permission এ option গুলা visible হবে যাতে আপনি assign করতে পারেন।

## Scope বহির্ভূত (এই plan-এ নেই)
- Lunch Order এবং Catering Service-এর full UI/DB schema — আলাদা plan লাগবে (vendor table, menu, daily order, billing integration)
- Leave management backend (leave_types, leave_balances, leave_applications tables) — আলাদা plan
- এই migration শুধু permission keys add করে, যাতে roles page থেকে toggle করা যায়

## প্রশ্ন (আপনার approval দরকার)
1. শুধু permission keys add করব এখন, না-কি Leave management + Catering-এর full DB schema-ও এই plan-এ ঢুকাব?
2. "Lunch Order" আর "Catering Service" আলাদা module রাখব, না একসাথে "Catering" group?