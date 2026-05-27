# Self-service portal — fixes + new modules

## 1. Critical bug fixes

### A. Attendance RLS (check-in fails)
`attendance` has no INSERT/UPDATE policy for self — only admin ALL + self SELECT. Add:
- `INSERT` for self: `WITH CHECK (employee_id = current_employee_id() AND source = 'self')`
- `UPDATE` for self: only when `source='self'` and only own row (for check-out)

### B. Leave balance shows "set নেই"
Balances exist in DB (CL/SL/EL etc.) but `MyLeave.tsx` & `MyDashboard.tsx` query wrong columns (`balance`, `leave_type_id`, `leave_types(name)`). Actual columns: `remaining_days`, `total_days`, `used_days`, `category_id`, with `leave_categories(name)`. Fix both files.

### C. Missing "ছুটির আবেদন" form
`MyLeave.tsx` only shows balance + history. Add an application form (category dropdown from `leave_categories`, start/end date → auto compute days, reason). Insert into `leave_applications` with `status='pending'`.

## 2. Restructure requests menu

Drop loan. Merge concept: advance = the only kind of "salary loan".

- Remove `/dashboard/me/loan` route + nav item.
- Rename "অগ্রিম বেতন" → "অগ্রিম বেতন (Salary Advance)" — same form (amount + reason).
- Remove "ঋণ" tab from admin `EmployeeRequests.tsx`.

## 3. Resignation — new rules

DB: add to `resignation_requests`:
- enforce single active request per employee (partial unique index on `employee_id` where `status IN ('pending','approved')`)
- add `min_notice_days` (default 30) read from `resign_rules` or system setting

Self-side `MyRequestPage` resignation mode:
- Date picker `min = today + 30 days`, no past dates. Helper text: "এক মাসের নিচে দিতে হলে admin-এর সাথে যোগাযোগ করুন।"
- If existing pending/approved request → hide form, show current request with **Update** / **Cancel** (delete) buttons.
- Admin retains override: can edit `effective_date` to any date from admin portal.

## 4. Requisition module (employee → admin)

Existing `requisitions` table is procurement-oriented (item_id, vendor_id). Extend for employee self-requests:
- ALTER TABLE: add `employee_id uuid`, `item_name text`, `description text`, `category text` (tools/router/mobile/component/other), `request_type text default 'employee'`.
- RLS: self can `INSERT` own + `SELECT` own; admin manages all.
- Auto-number trigger reuse `requisition_no`.

Replace `MyRequisitions.tsx` placeholder with:
- Form: item name, category, qty, estimated price, description.
- History table with status badges.

Admin: hook into existing `EmployeeRequests.tsx` as a 3rd tab "রিকুইজিশন" (filter `request_type='employee'`) with approve/reject.

## 5. Payslip — full breakdown + PDF

`MyPayslip.tsx` currently lists rows only. Add:
- Row → "বিস্তারিত" dialog showing basic, allowances, deductions (from `payroll_details` joined to `payheads`), loan/advance deductions, net, paid, due.
- Replace `window.print()` with a proper PDF download (reuse `src/lib/reportExport.ts` if available, else jsPDF) styled like admin payslip.

## 6. Admin employee profile — at-a-glance tabs

In `src/pages/dashboard/hr/Employees.tsx` employee detail dialog, add tabs:
Profile · হাজিরা (last 30d) · ছুটি (balance + applications) · পে-স্লিপ · অগ্রিম · পদত্যাগ · রিকুইজিশন
Reuse same queries as self pages, scoped by `employee_id`.

## Technical sections

### Migration
```sql
-- attendance self insert/update
CREATE POLICY "Self can insert own attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() AND source = 'self');
CREATE POLICY "Self can update own attendance" ON public.attendance
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND source = 'self');

-- resignation: single active
CREATE UNIQUE INDEX one_active_resignation
  ON public.resignation_requests(employee_id)
  WHERE status IN ('pending','approved');

-- self can update/delete own pending resignation
CREATE POLICY "self update pending resignation" ON public.resignation_requests
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');
CREATE POLICY "self delete pending resignation" ON public.resignation_requests
  FOR DELETE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');

-- requisitions extend
ALTER TABLE public.requisitions
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'procurement';

CREATE POLICY "Self can insert own requisition" ON public.requisitions
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() AND request_type = 'employee');
CREATE POLICY "Self can view own requisition" ON public.requisitions
  FOR SELECT TO authenticated
  USING (employee_id = current_employee_id() OR is_admin_or_super(auth.uid()));
CREATE POLICY "Self can update/cancel own pending requisition" ON public.requisitions
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');
```

### Files to edit/create
- `src/pages/dashboard/me/MyLeave.tsx` — fix columns + add application form
- `src/pages/dashboard/me/MyDashboard.tsx` — fix leave balance query
- `src/pages/dashboard/me/MyPayslip.tsx` — breakdown dialog + PDF
- `src/pages/dashboard/me/MyRequisitions.tsx` — full module
- `src/pages/dashboard/me/MyRequestPage.tsx` — new resignation rules (single, +30d, edit/cancel)
- `src/components/me/MyShell.tsx` — drop "ঋণ" item
- `src/App.tsx` — drop `/dashboard/me/loan` route
- `src/pages/dashboard/hr/EmployeeRequests.tsx` — drop loan tab, add requisition tab
- `src/pages/dashboard/hr/Employees.tsx` — tabbed at-a-glance view in detail dialog

No backend changes outside the single migration above.
