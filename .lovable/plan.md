## লক্ষ্য

Employee list-কে action-rich করব (4টা button), Employee View page বানাব (client view-এর মতো বিস্তারিত), আর Payslip Manager বানাব যেখান থেকে bulk select করে যেকোনো মাসের payslip generate/regenerate করা যাবে।

---

## ১. Employee List পরিবর্তন (`Employees.tsx`)

বর্তমান Edit + Delete এর জায়গায় ৪টি action icon button:

```text
[👁 View] [✏️ Edit] [💵 PayHeads] [📅 Holidays]
```

- **View** → নতুন route `/dashboard/hr/employees/:id` খুলবে
- **Edit** → existing add-employee form (edit mode)
- **PayHeads** → modal: এই employee-কে assigned template-এর payheads list, প্রতিটির default amount + override option (employee-specific)
- **Holidays** → modal: employee-এর assigned shift অনুসারে weekly off + holiday list (current month + next month)

এছাড়াও:
- প্রতিটি row-এর শুরুতে **checkbox** + header-এ "Select All"
- Filter bar-এ নতুন button: **"Generate Payslip"** (bulk action, enabled when ≥1 selected) → directly Payslip Manager-এ navigate করবে selected IDs সহ

---

## ২. Employee View page (`EmployeeView.tsx`, new)

Route: `/dashboard/hr/employees/:id`

Tab layout (client view-এর মতো):

- **Profile**: ছবি, Employee ID, নাম, ডিপার্টমেন্ট, পদবী, যোগদান তারিখ, NID, ফোন, address, education — সবগুলো field card-style
- **Salary Summary** (top stat cards):
  - Total Bill Generated (সব month-এর net_salary যোগফল)
  - Total Paid (paid status)
  - Total Due (unpaid)
  - Base Salary, Current Template
- **Payslip History** (timeline, screenshot 3 এর মতো):
  - প্রতিটি month entry: period name, "Fully Paid / Unpaid" badge, generated date
  - "Pay" + "Cancel" + "Edit Payheads for Regenerate" buttons unpaid-এর জন্য
  - "View Full History..." link → individual payslip detail
- **PayHeads tab**: assigned payheads ও তাদের amount
- **Attendance Summary tab**: এই মাসের present/absent/late count

---

## ৩. Payslip Manager (`Payslip.tsx` rewrite)

বর্তমান single-employee payslip viewer-কে replace করে screenshot 2 এর মতো Manager:

**Top bar:**
- Month picker (default = current month)
- Employee Type: Active / Left / All
- Search Employee
- **Generate** (bulk), **View**, **Regenerate** buttons

**Row layout (per employee):**
```text
☑ [Name + ID]   [Period dropdown (May-26)]   Generate Payslip for: May-26
                                              --> Position (Monthly Payroll)
                                              [💵 icon] Payheads Total: 23,600
```

- "Select All Employee" checkbox top-left
- প্রতিটি row default = active payroll template থেকে calculated total
- কোনো employee-এ click করলে inline payhead edit (override per-month)
- **Generate** → selected employee-দের জন্য `payroll` row insert করবে for selected month (basic + allowance − deduction), attendance থাকলে late/early auto deduct
- **Regenerate** → existing row delete করে recompute
- **Filter chips**: All / Regular (net == template total) / Bonus (net > template) / Less (net < template)

---

## ৪. Per-month Payhead Override

নতুন column `payroll.adjustments jsonb` যোগ হবে — প্রতি month-এ যদি কোনো payhead-এর amount override করা হয় (যেমন এই মাসে bonus), সেটা এখানে store হবে। Regenerate এর সময় override থাকলে সেটাই use হবে, না থাকলে template default।

---

## ৫. Attendance auto-deduction (যদি enabled)

Generate-এর সময় selected month-এর attendance থেকে:
- Late minutes × late-fee-payhead amount
- Early-out minutes × early-fee-payhead amount
- Absent days × per-day-salary
এগুলো auto deduction হিসেবে যোগ হবে। `hr_settings` table-এ already late/early rules আছে — সেগুলোই ব্যবহার করব।

---

## প্রযুক্তিগত পরিবর্তন (technical)

**Migration:**
- `ALTER TABLE payroll ADD COLUMN adjustments jsonb DEFAULT '[]'::jsonb;`
- `ALTER TABLE payroll ADD COLUMN period_label text;` (যেমন "May-26")
- `ALTER TABLE payroll ADD COLUMN generated_at timestamptz DEFAULT now();`
- Index: `(employee_id, month)` unique

**Routes (App.tsx-এ যোগ):**
- `/dashboard/hr/employees/:id` → `EmployeeView`

**ফাইল তৈরি/সম্পাদনা:**
- edit: `src/pages/dashboard/hr/Employees.tsx` (checkbox + 4 action buttons + bulk navigate)
- new: `src/pages/dashboard/hr/EmployeeView.tsx`
- rewrite: `src/pages/dashboard/hr/Payslip.tsx` (Payslip Manager)
- new: `src/components/hr/EmployeePayheadsDialog.tsx`
- new: `src/components/hr/EmployeeHolidaysDialog.tsx`
- new: `src/lib/payrollCompute.ts` (template + adjustment + attendance compute logic)
- edit: `src/App.tsx` (new route)

**SalarySheet.tsx** অপরিবর্তিত থাকবে — সেটা ইতিমধ্যেই monthly summary দেখায়।

---

## পরিবর্তনের বাইরে যা থাকবে না

- Payroll templates / Payheads / Periods configuration page — আগের মতোই
- Attendance, Leave, Resignation modules — touch করব না
