

## কাজ — POP Admin Employee module simplification

### ১) Sidebar cleanup (`ResellerLayout.tsx`)
"কর্মচারী" group থেকে **Payroll** ও **Attendance** বাদ। শুধু থাকবে:
- Add Employee
- Employee List
- Salary Sheet

### ২) Routes cleanup (`App.tsx`)
বাদ:
- `/pop-admin/employees/payroll`
- `/pop-admin/employees/attendance`

`/pop-admin/employees/salary-sheet` placeholder → নতুন real page `<PopSalarySheet />`।

### ৩) Add Employee form — Division/District/Upazila সরাসরি main DB থেকে (`PopAddEmployee.tsx` + `PopEditEmployee.tsx`)
এখন District/Upazila plain `<Input>` text। বদলে cascading dropdown:
- **Division** → `divisions` table থেকে (8টা already seeded)
- **District** → `districts` table, selected division অনুযায়ী filter
- **Upazila** → `upazilas` table, selected district অনুযায়ী filter

কোনো নতুন table/seed না — existing main DB তিনটা table পুনঃব্যবহার। `employees` table-এ নতুন column যোগ:
- `division_id uuid` (nullable, FK divisions)
- `district_id uuid` (nullable, FK districts) — বর্তমানে `district` text আছে, এটা সাথে রাখব backward compat-এ; নতুন সব entry id দিয়ে save হবে
- `upazila_id uuid` (nullable, FK upazilas)

নতুন reusable `<DivisionDistrictUpazilaSelect>` component বানাব, যেটা দুই form-এ ব্যবহার হবে।

### ৪) Salary Sheet page (নতুন `PopSalarySheet.tsx`)
Reference image-203 অনুযায়ী **simple** version:

**Layout:**
- Header: "Salary Sheet" + Month filter dropdown (Apr-26 style) + "**+ Pay Salary**" button (top-right)
- Table columns: Name | Month | Basic Salary | Paid Salary | Overtime | Incentive | Bonus | Advance Salary | Due | Total Amount | Action
- Bottom row: TOTAL (sum of Total Amount)

**+ Pay Salary modal:** (image-203 দেখানো হয়েছে)
- Employee Name * (dropdown — branch-scoped employees)
- Month *
- Paid Salary *
- Overtime
- Incentive
- Bonus
- Paid Date * (default: now)
- Remarks/Note
- Clear / Save / Close buttons

**Data:** existing `salary_sheets` table পুনঃব্যবহার + প্রয়োজনীয় column যোগ:
- `branch_id uuid` (POP isolation)
- `paid_salary numeric default 0`
- `overtime numeric default 0`
- `incentive numeric default 0`
- `bonus numeric default 0`
- `advance numeric default 0`
- `due numeric default 0`
- `paid_date timestamptz`
- `remarks text`
- `total_amount numeric` (computed: paid+overtime+incentive+bonus−advance)

Branch-scoped query — `WHERE branch_id = {pop branch}`। RLS policy যোগ করব branch isolation এর জন্য।

### ৫) Salary status field (form-এ)
Add Employee form-এ ইতিমধ্যে "Status" আছে (active/inactive)। User বললেন **Salary status** আলাদা চান না — শুধু একটাই salary field থাকবে যেটা Posting Information section-এর "Salary"। এটা অপরিবর্তিত থাকছে। কোনো অতিরিক্ত salary status add করা হবে না।

## কোন file বদলাবে / নতুন

**Migration (database):**
- `employees` table-এ `division_id`, `district_id`, `upazila_id` column যোগ
- `salary_sheets` table-এ `branch_id`, `paid_salary`, `overtime`, `incentive`, `bonus`, `advance`, `due`, `paid_date`, `remarks`, `total_amount` column যোগ
- `salary_sheets` RLS — branch-scoped policy যোগ (POP portal access)

**নতুন (2 files):**
- `src/components/reseller/DivisionDistrictUpazilaSelect.tsx` — reusable cascading dropdown
- `src/pages/reseller/employee/PopSalarySheet.tsx` — list + Pay Salary dialog

**Edit:**
- `src/components/ResellerLayout.tsx` — Payroll/Attendance link সরানো
- `src/App.tsx` — payroll/attendance route মুছে, salary-sheet placeholder → real component
- `src/pages/reseller/employee/PopAddEmployee.tsx` — district/upazila text input → cascading select
- `src/pages/reseller/employee/PopEditEmployee.tsx` — same select যোগ

## কোন file বদলাবে না
- `divisions`/`districts`/`upazilas` table বা seed data
- Admin dashboard এর HR/Employee/Salary pages
- Employee user-access section (image-201 এর কাজ অপরিবর্তিত)
- Accounting / packages / pricing / অন্য সব POP module

## Apply-এর পরে expected ফলাফল
1. ✅ POP sidebar-এ "কর্মচারী" group-এ ৩টা item: Add / List / Salary Sheet
2. ✅ Add Employee-এ Division → District → Upazila cascading dropdown — main DB থেকে data
3. ✅ Salary Sheet page reference image-203 অনুযায়ী, "+ Pay Salary" modal কাজ করবে
4. ✅ Branch isolation — এক POP-এর salary data অন্য POP দেখবে না
5. ✅ Payroll / Attendance menu আর সাইডবারে নেই, route 404 হবে না (সরিয়ে দেওয়া হয়েছে)
6. ✅ Admin dashboard untouched

