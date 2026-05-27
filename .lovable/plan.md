## লক্ষ্য

NAHID / EMP001 login করলে যেন নিজের employee profile ঠিকভাবে load হয়, এবং employee self-service moduleগুলো বাস্তবে কাজ করে: profile, attendance, leave, payslip, requests, meal order। Admin/HR side-এ catering service, weekly menu, subsidy, daily order summary এবং SMS/email পাঠানোর ব্যবস্থা যোগ করা হবে।

## Root cause

বর্তমানে NAHID-এর ডেটা DB-তে যুক্ত আছে:

- `employees`: EMP001 / NAHID আছে।
- `app_users`: EMP001 user আছে এবং `employee_id` দিয়ে ওই employee row-এর সাথে linked।

সমস্যা হচ্ছে RLS policy-তে `app_users`, `employees`, `attendance`, `leave_applications`, `leave_balances`, `payroll` মূলত admin-only read। তাই employee login করলে frontend নিজের `app_users -> employee` row পড়তে পারে না, ফলে “আপনার অ্যাকাউন্ট কোনো কর্মীর সাথে যুক্ত নয়” দেখাচ্ছে।

## Phase 1 — EMP001/self-service access fix

1. DB RLS ঠিক করব:
   - logged-in employee নিজের `app_users` row দেখতে পারবে।
   - নিজের `employees` row দেখতে পারবে।
   - নিজের attendance, leave application, leave balance, payroll/payslip দেখতে পারবে।
   - write access admin/HR-এর কাছেই থাকবে; employee শুধু নিজের allowed request submit করতে পারবে।

2. `useEmployeeContext` robust করব:
   - আগে `app_users.auth_user_id = auth.uid()` দিয়ে linked employee আনবে।
   - relation না এলে fallback হিসেবে current employee id resolve করবে।
   - loading/error state পরিষ্কার দেখাবে, false “not linked” দেখাবে না।

3. Self-service pages ঠিক করব:
   - Attendance table-এর real columns `check_in/check_out` ব্যবহার করবে, এখন UI ভুলভাবে `in_time/out_time` পড়ছে।
   - Profile/Leave/Payslip empty state ও error handling ঠিক করব।

## Phase 2 — Employee request modules ready করা

1. Profile change request:
   - Employee নিজের পরিবর্তনের আবেদন করবে।
   - HR/Admin approve করলে employee table update হবে।

2. Leave request:
   - Employee ছুটির আবেদন করতে পারবে।
   - HR/Admin pending leave approve/reject করতে পারবে।
   - Leave balance view employee side-এ ঠিকভাবে দেখাবে।

3. Salary advance / loan / resignation:
   - Existing request pages clean করব।
   - Admin/HR review page-এ approve/reject, status, remarks properly রাখব।

4. Requisition:
   - “শীঘ্রই আসছে” placeholder বাদ দিয়ে basic requisition request form + admin review workflow করব।

## Phase 3 — Catering service admin module

Existing `/dashboard/hr/catering` module expand করব:

1. Catering service profile:
   - service name
   - owner name
   - phone/contact
   - email
   - address
   - active/inactive

2. Weekly menu setup:
   - Saturday–Friday menu setup থাকবে।
   - item checkbox/preset support: ভাত, ডাল, সালাদ, ভর্তা ইত্যাদি।
   - main item text/selection: মুরগি, মাছ, beef, fried rice ইত্যাদি।
   - price per meal, default `৳120`।
   - cutoff time।
   - কোনোদিন খাবার বন্ধ থাকলে “closed day” হিসেবে mark করা যাবে।

3. Subsidy rules:
   - company-wide default: none / half / full।
   - half হলে employee pays ৳60, company pays ৳60 for ৳120 meal।
   - full হলে employee pays ৳0, company pays ৳120।
   - specific employee override থাকবে, যেমন কোনো employee full subsidized হতে পারে।

## Phase 4 — Employee meal order module

`/dashboard/me/meals` উন্নত করব:

1. Employee আজকের/নির্বাচিত দিনের menu দেখতে পারবে।
2. Closed day হলে order button থাকবে না।
3. Subsidy হিসাব দেখাবে:
   - total price
   - employee payable
   - company subsidy
4. Employee order/cancel করতে পারবে cutoff সময়ের মধ্যে।
5. Duplicate order prevent থাকবে।
6. নিজের monthly meal cost summary দেখাবে।

## Phase 5 — Daily catering order summary + SMS/email

Admin/HR side-এ order summary যোগ করব:

1. Date-wise order dashboard:
   - কোন catering service-এ কয়টা order পড়েছে।
   - menu snapshot সহ total count।
   - employee payable total, company subsidy total, total food cost।

2. Send to catering owner:
   - SMS/email message preview।
   - Example: আজকের menu, total order count, delivery note।
   - Existing SMS/email system থাকলে সেটার সাথে integrate করব; না থাকলে send action placeholder/log দিয়ে রাখব যাতে later gateway বসানো যায়।

## Technical changes

1. Supabase migration:
   - self-read RLS policies for employee-linked data।
   - catering tables-এ নতুন columns: owner/contact/email/address/default subsidy/settings।
   - meal orders-এ employee_payable/company_subsidy/menu label/status fields যোগ করা।
   - optional নতুন tables: `meal_subsidy_rules`, `meal_order_dispatches`, requisition tables if missing।

2. Frontend files:
   - `src/hooks/useEmployeeContext.ts`
   - `src/pages/dashboard/me/*`
   - `src/pages/dashboard/hr/Catering.tsx`
   - `src/pages/dashboard/hr/EmployeeRequests.tsx`
   - sidebar/menu mapping if new admin pages need visible menu links।

3. Security:
   - Employee নিজের data ছাড়া অন্য employee data পড়তে পারবে না।
   - Admin/Super Admin manage করতে পারবে।
   - Employee defaultভাবে main admin modules দেখবে না; শুধু `আমার প্যানেল` দেখবে।

## Implementation order

1. আগে NAHID/EMP001 linked employee load issue fix করব।
2. তারপর attendance/leave/payslip self-view fix করব।
3. তারপর meal/catering schema + admin setup page।
4. তারপর employee meal order + subsidy হিসাব।
5. শেষে daily summary এবং SMS/email dispatch flow।