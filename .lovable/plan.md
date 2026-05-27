
## লক্ষ্য

Admin portal-এ HR-এর কিছু core সুবিধা ও policy যোগ করা — default leave entitlement, probation logic, self check-in/out, shift roster, weekly holiday, conveyance bill, এবং catering provider + weekly menu admin UI। NAHID-কে test employee হিসেবে এই সব policy auto-assign হবে।

## Phase 1 — Default Leave Policy + Probation Logic

1. দুটি default leave type seed করা: **Casual Leave (10/বছর)**, **Sick Leave (12/বছর)**।
2. `employees` table-এ `probation_period_months` (default 3), `probation_end_date`, `confirmation_date`, `is_confirmed` column থাকবে।
3. নতুন employee add করলে:
   - probation start = joining date, end = joining + probation months।
   - confirmation না হওয়া পর্যন্ত leave entitlement = 0 (খাবার সুবিধা থাকবে)।
4. Confirmation action (HR button): salary increment field (optional) + auto leave balance assign।
5. **Pro-rated leave calculation** (Jan–Dec basis):
   - confirmation মাস থেকে December পর্যন্ত যত মাস বাকি, তত মাসের অনুপাতে leave।
   - সূত্র: `floor(annual_quota × remaining_months / 12)`। কোনো fraction না।
   - উদাহরণ: June-এ confirm → CL = floor(10×7/12)=5, SL = floor(12×7/12)=7।
6. প্রতি বছর January-1 এ leave balance reset/refresh (manual বা scheduled — আপাতত admin button)।
7. UI: Employee profile-এ **Leave Entitlement** panel — type, annual quota, current year balance, used, remaining।

## Phase 2 — Self Check-in / Check-out (Employee)

1. `/dashboard/me/attendance` page-এ **Check In** ও **Check Out** button যোগ।
2. Employee নিজেই check_in/check_out push করতে পারবে (status = `pending_verify`)।
3. Admin/HR-এর কাছে **Attendance Verification Queue** — approve/reject।
4. Admin সরাসরি entry দিলে status = `verified` by default।
5. Source field: `self` / `admin` / `device(zkteco)`।

## Phase 3 — Shift Management (Roster)

1. `shifts` table: name, start_time, end_time, branch_id।
2. `employee_roster`: employee_id, date, shift_id।
3. UI: **Roster Planner** page — Weekly বা Monthly view toggle।
   - একসাথে multiple employee select → shift drag/assign।
   - Bulk apply: "প্রতি শনি-বৃহঃ Shift A, শুক্র off"।
4. Save করলে date-ভিত্তিক row insert হবে।

## Phase 4 — Weekly Holiday per Employee

1. Employee Action calender button-এর label পরিবর্তন → **"সাপ্তাহিক ছুটি"**।
2. Dialog-এ Sat–Fri checkbox। Tick করলে `employees.weekly_off_days` (int array, e.g. `[5]` = Friday) save।
3. Attendance generation / leave calculation এই দিনগুলো skip করবে — auto holiday।

## Phase 5 — Conveyance Bill

1. `conveyance_bills` table: employee_id, date, from_location, to_location, purpose, amount, attachment, status (pending/approved/rejected), approver_id, remarks।
2. Employee side: `/dashboard/me/conveyance` — submit form + history list।
3. Admin side: `/dashboard/hr/conveyance` — pending queue → approve/reject → approved bills payroll-এ "Conveyance Reimbursement" allowance হিসেবে add option।

## Phase 6 — Catering Provider + Weekly Menu (Admin UI)

বর্তমানে `Catering.tsx`-এ basic service + day-wise menu আছে, কিন্তু **provider profile** ও **price/menu workflow** অসম্পূর্ণ। যোগ করব:

1. `catering_services` expand: `owner_name`, `phone`, `email`, `address`, `default_meal_price` (৳120), `cutoff_time`, `is_active`।
2. Weekly menu form উন্নত: item checkbox preset (ভাত, ডাল, সালাদ, ভর্তা) + main item dropdown (মুরগি, মাছ, beef) + price per day + "closed day" toggle।
3. Subsidy rule: company default (none/half/full) + per-employee override।
4. Admin দেখতে পাবে কোন provider কোন দিন কী menu, কত price।

## Phase 7 — NAHID-কে test policy assign

1. Migration-এর শেষে NAHID-এর জন্য:
   - confirmation_date = today (already passed probation ধরে)।
   - CL balance = 10, SL balance = 12 (full year)।
   - weekly_off = Friday।
2. যাতে user সরাসরি login করে সব flow test করতে পারে।

## Technical changes summary

**Migrations:**
- `leave_types` seed (CL, SL with default annual quota)
- `employees` add: probation_period_months, probation_end_date, confirmation_date, is_confirmed, weekly_off_days, salary_at_confirmation
- `leave_balances` ensure year-wise rows
- new `shifts`, `employee_roster`, `conveyance_bills` tables (with GRANT + RLS)
- `attendance` add: source, verification_status, verified_by
- `catering_services` add: owner_name, phone, email, address, default_meal_price, cutoff_time
- function `calc_prorated_leave(annual_quota, confirm_date)` returns int
- function `confirm_employee(emp_id, new_salary?)` — sets confirmation, creates balance rows

**Frontend files:**
- `src/pages/dashboard/hr/LeavePolicy.tsx` (new) — default types + quota config
- `src/pages/dashboard/hr/Employees.tsx` — probation/confirmation UI, weekly off dialog rename
- `src/pages/dashboard/me/MyAttendance.tsx` — check-in/out button
- `src/pages/dashboard/hr/AttendanceVerify.tsx` (new) — approval queue
- `src/pages/dashboard/hr/Roster.tsx` (new) — weekly/monthly shift planner
- `src/pages/dashboard/me/MyConveyance.tsx` + `src/pages/dashboard/hr/Conveyance.tsx`
- `src/pages/dashboard/hr/Catering.tsx` — owner profile + improved menu form + subsidy rules

## Implementation order

1. Phase 1 (leave policy + probation) — foundation
2. Phase 4 (weekly holiday) — quick win, ties to leave/attendance
3. Phase 2 (self check-in/out + verify)
4. Phase 3 (shift roster)
5. Phase 5 (conveyance)
6. Phase 6 (catering admin UI completion)
7. NAHID seed at the end
