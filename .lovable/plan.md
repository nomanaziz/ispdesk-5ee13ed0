# HR Facilities + Conveyance Workflow

দুইটা বড় feature যোগ হবে:
1. **Employee Facilities/Benefits** — accommodation, food allowance, monthly food cash ইত্যাদি কে কী পাবে সেটা configure করা, এবং প্রতি মাসে attendance অনুযায়ী auto-calculate করে payroll ও accounts-এ যাওয়া।
2. **Conveyance Bill Workflow** — employee নিজের portal থেকে daily trip entry দিবে (from-to, mode, fare), HR/Admin verify/reject করবে, approved গুলো expense + payroll/reimbursement-এ যাবে।

---

## ১. Facility Policy Setup (Master data)

**নতুন page:** `/dashboard/hr/facility-policies`

একটা policy = একটা facility template। Admin policy বানাবে, তারপর employee profile-এ assign করবে।

Policy types:
- **Accommodation**
  - Mode: `company_provided` (কোম্পানি দেয়) / `house_rent_allowance` (cash মাসিক) / `none`
  - Amount: monthly cash (mode = house_rent_allowance হলে)
- **Food / Lunch**
  - Mode:
    - `full_subsidized` — কোম্পানি পুরো খরচ বহন করে, employee থেকে কাটবে না
    - `partial_subsidized` — per meal employee share + company share (দুইটা amount)
    - `self_paid` — employee নিজে কিনে খাবে (payroll থেকে কাটবে)
    - `monthly_cash` — মাসিক fixed amount (যেমন 400৳) salary-র সাথে যোগ
    - `per_duty_day_cash` — duty করা দিনে per-day cash (যেমন 100৳/day)
  - Per-meal/per-day amount + company share / employee share
  - Trigger condition: `present_only` (duty করলেই) / `present_or_overtime` / `overtime_only`
- **Overtime/Outdoor food allowance** — overtime বা outdoor duty দিনে per-day cash

প্রতি policy একটা payhead-এর সাথে link হবে (existing `payheads` table) যাতে payroll generation-এ auto add/deduct হয়।

---

## ২. Employee Facility Assignment

`EmployeeView` ও `AddEmployee` page-এ নতুন **"Facilities" tab**:
- Checkbox list: কোন কোন policy এই employee পাবে
- Override: amount override করার option (যেমন default 400৳ কিন্তু এই employee-কে 500৳)
- Effective from/to date

---

## ৩. Monthly Auto-Calculation (Payroll integration)

Payroll generate করার সময়:
- প্রতিটি assigned facility loop করে
- Attendance log থেকে present days, overtime days, outdoor days count
- নিচের নিয়মে calculate:
  - `monthly_cash` → fixed amount
  - `per_duty_day_cash` → present_days × per_day
  - `partial_subsidized food` → present_days × employee_share (deduction হিসাবে)
  - `full_subsidized` → শুধু record রাখবে, salary effect নাই
  - `house_rent_allowance` → fixed monthly
- Result গুলো `payroll_details`-এ payhead হিসাবে যোগ হবে (addition বা deduction)
- Payslip-এ আলাদা line item দেখাবে

---

## ৪. Conveyance Bill — Employee Portal

**নতুন page:** `/employee-portal/conveyance` (employee user_username/password দিয়ে login — existing `has_user_access` infrastructure)

Employee form:
- Date (default আজ)
- From location → To location
- Purpose (কোন কাজে)
- Transport mode: `rickshaw` / `bus` / `cng` / `uber` / `bike` / `walk` / `other`
- Fare amount
- Other cost (optional, with note)
- Receipt upload (optional image)
- Submit → status = `pending`

List view: তার নিজের সব entry মাস ভিত্তিক, status badge (pending/approved/rejected), total

---

## ৫. HR/Admin Verification

**নতুন page:** `/dashboard/hr/conveyance-bills`

- Filter: employee, month, status, branch
- প্রতিটি row-এ details + Approve/Reject button + remark field
- Bulk approve option
- Approved হলে:
  - `expense_entries`-এ auto insert (category = 'Conveyance', employee reference সহ)
  - মাস শেষে payroll generation-এ employee-র total approved conveyance reimbursement হিসাবে যোগ হবে (একটা special "Conveyance Reimbursement" payhead-এর মাধ্যমে)
- Rejected হলে remark সহ employee portal-এ দেখাবে

Permission: শুধু HR/Admin role বা যাকে specifically `conveyance.verify` permission দেওয়া আছে।

---

## ৬. Accounts Integration

- Facility cash (food/accommodation/conveyance reimbursement) payroll generate করলে যেভাবে salary expense accounts-এ hit করে ঠিক সেইভাবে যাবে (existing payroll → accounts pipeline ব্যবহার)
- Direct approved conveyance bill → `expense_entries` table → already accounts-এ যায়

---

## Database Changes (Technical)

```text
facility_policies
  id, tenant_id, branch_id (nullable=সব branch)
  name, type ('accommodation'|'food'|'overtime_food'|'custom')
  mode (text), trigger ('present_only'|'present_or_overtime'|'overtime_only'|'always')
  amount, company_share, employee_share, per_unit ('day'|'meal'|'month')
  linked_payhead_id (FK payheads), is_deduction bool
  active bool

employee_facilities
  id, employee_id, facility_policy_id
  override_amount nullable, effective_from, effective_to, notes

conveyance_bills
  id, tenant_id, employee_id, bill_date
  from_location, to_location, purpose
  transport_mode, fare_amount, other_amount, other_note
  receipt_url nullable
  status ('pending'|'approved'|'rejected')
  reviewed_by, reviewed_at, review_remark
  expense_entry_id nullable (link after approval)
  payroll_period_id nullable (যে মাসে reimburse হল)
```

সব table-এ `tenant_id`-based RLS + `GRANT` (authenticated/service_role)। Employee নিজের `conveyance_bills` দেখা/তৈরি করার RLS policy (employee.user_id = auth.uid())।

---

## Pages/Files তৈরি/edit হবে

- `src/pages/dashboard/hr/FacilityPolicies.tsx` — new
- `src/pages/dashboard/hr/ConveyanceBills.tsx` — new (HR verify)
- `src/pages/employee-portal/Conveyance.tsx` — new (employee entry) (employee portal route group তৈরি/extend)
- `src/pages/dashboard/hr/EmployeeView.tsx` — Facilities tab যোগ
- `src/pages/dashboard/hr/AddEmployee.tsx` — facility assign section
- Payroll generation function/edge function — facility calculation logic যোগ
- Sidebar menu — নতুন link

---

## Build order

1. DB migration (4 table + grants + RLS)
2. Facility Policies CRUD page
3. EmployeeView Facilities tab (assign)
4. Payroll generation-এ facility calc যোগ
5. Conveyance entry page (employee portal)
6. HR Conveyance verify page + approve → expense + reimbursement flow

---

## একটা ছোট প্রশ্ন

**Employee portal login**: এখন `employees` table-এ `has_user_access` + `user_username/password` আছে। Conveyance entry-র জন্য আমি এই existing login-ই ব্যবহার করব, নাকি Supabase auth.users-এর সাথে আলাদা employee account খুলব? পুরনো plan-এ আপনাকে A/B/C option দিয়েছিলাম তখন উত্তর পাইনি। এখন বলে দিলে সব employee-facing page একসাথে সেই auth দিয়ে বানাব।

Approve করলে আমি migration → page-by-page implement শুরু করব।
