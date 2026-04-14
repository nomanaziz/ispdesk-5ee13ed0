

## Plan: Full HR & Payroll Module

All 12 HR pages are currently placeholders. The database already has tables for `employees`, `departments`, `positions`, `payheads`, `payroll`, `resign_rules`, and `resignations`. We need to create missing tables and build out all frontend pages.

---

### Phase 1: Database Migration

Create missing tables:

**1. `attendance`** — daily attendance tracking
- `id`, `employee_id` (FK → employees), `date`, `check_in` (time), `check_out` (time), `status` (present/absent/late/half_day/leave), `remarks`, `created_at`

**2. `rejoin_requests`** — track resigned employees who rejoin
- `id`, `employee_id` (FK → employees), `resignation_id` (FK → resignations), `rejoin_date`, `new_salary`, `new_department_id`, `new_position_id`, `remarks`, `status` (pending/approved/rejected), `approved_by`, `created_at`

**3. `payroll_details`** — per-payhead breakdown for each payroll entry
- `id`, `payroll_id` (FK → payroll), `payhead_id` (FK → payheads), `amount`, `created_at`

**4. `salary_sheets`** — monthly salary sheet snapshots
- `id`, `month` (date), `employee_id` (FK → employees), `basic_salary`, `total_allowance`, `total_deduction`, `net_salary`, `status` (draft/finalized), `created_at`

Add RLS policies (admin-only manage, authenticated read) for all new tables.

---

### Phase 2: Frontend Pages (12 files)

**1. `Departments.tsx`** — CRUD using `ConfigCrudPage`
- Fields: name, status

**2. `Positions.tsx`** — CRUD using `ConfigCrudPage`
- Fields: name, status

**3. `Payheads.tsx`** — CRUD for pay components (allowances/deductions)
- Fields: name, type (allowance/deduction), amount, is_percentage, status

**4. `AddEmployee.tsx`** — Multi-section form
- Personal: name, employee_id, email, phone, gender, DOB, NID, address
- Job: department (dropdown), position (dropdown), joining_date, salary
- Status, show_on_website toggle
- Save & redirect to Employee List

**5. `Employees.tsx`** — Employee list table
- Columns: Employee ID, Name, Department, Position, Phone, Salary, Status, Action
- Edit/delete actions, search, filters by department/status

**6. `Attendance.tsx`** — Daily attendance
- Date picker, employee list with check-in/check-out/status
- Bulk mark present, filter by date range
- Summary cards (present/absent/late/leave count)

**7. `Payroll.tsx`** — Monthly payroll processing
- Month selector, generate payroll for all active employees
- Table: Employee, Basic, Allowances, Deductions, Net Salary, Status
- Pay/unpay toggle per employee

**8. `SalarySheet.tsx`** — Monthly salary summary report
- Month filter, table with all employees' salary breakdown
- Generate PDF/Excel export buttons

**9. `Payslip.tsx`** — Individual payslip viewer
- Select employee + month, show payslip with payhead breakdown
- Print-friendly layout

**10. `ResignRules.tsx`** — CRUD using `ConfigCrudPage`
- Fields: name, notice_period_days, status

**11. `Resignations.tsx`** — Resignation management
- Table: Employee, Resign Date, Last Working Date, Reason, Status
- Add resignation dialog, approve/reject actions

**12. `Rejoin.tsx`** — Rejoin management
- Table of resigned employees eligible for rejoin
- Add rejoin dialog: select employee, new salary, department, position, rejoin date
- Approve/reject workflow

---

### Technical Notes
- Department/Position dropdowns in employee forms pull from `departments` and `positions` tables
- Payroll generation auto-calculates: basic salary + SUM(allowance payheads) - SUM(deduction payheads) = net salary
- Payheads with `is_percentage=true` calculate as percentage of basic salary
- All pages follow the existing pattern: `useQuery` for fetching, `useMutation` for upsert, `sonner` toast for feedback
- Simple CRUD pages (Departments, Positions, ResignRules, Payheads) use the `ConfigCrudPage` component

