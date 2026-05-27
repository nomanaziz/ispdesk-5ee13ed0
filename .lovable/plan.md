## পরিকল্পনা: Default Monthly Payroll + Auto Payhead Split + Monthly Adjustment

### লক্ষ্য
প্রত্যেক active employee-র জন্য payroll template না থাকলেও by default monthly payroll apply হবে, payslip generate করলে basic/house rent/conveyance/medical সহ payhead আসবে, এবং প্রতি মাসে employee-wise amount কম-বেশি করার option থাকবে।

### ১. Default Monthly Payroll নিশ্চিত করা
- `Monthly Payroll` নামে একটি default template থাকবে।
- যে employee-র `payroll_template_id` খালি আছে, payslip calculation-এ এই default template ব্যবহার হবে।
- Employee add/edit screen-এ payroll template না দিলে auto default monthly payroll ধরা হবে।
- Payslip list-এ template নাম `Monthly Payroll (Default)` হিসেবে দেখাবে, খালি `—` থাকবে না।

### ২. Default payhead structure তৈরি/seed
Default payroll-এর মধ্যে এই payhead গুলো থাকবে:
- `Basic Salary` — 50% of employee gross salary
- `House Rent` — remaining 50%-এর 75% = gross salary-এর 37.5%
- `Conveyance Allowance` — remaining 50%-এর 12.5% = gross salary-এর 6.25%
- `Medical Allowance` — remaining 50%-এর 12.5% = gross salary-এর 6.25%
- `Bonus` — default 0, monthly edit করলে যোগ হবে
- `Early Out` — default 0, deduction হিসেবে থাকবে
- প্রয়োজনে existing `Food Allowance`, `Increment` থাকলে default template-এ যুক্ত থাকবে; না থাকলে তৈরি হবে।

> ফলে 12,000 salary হলে default split হবে: Basic 6,000 + House Rent 4,500 + Conveyance 750 + Medical 750 = Total 12,000।

### ৩. Calculation logic ঠিক করা
- বর্তমান `computeForEmployee()` template না থাকলে empty line দিচ্ছে; এটা বদলে default template + fallback formula ব্যবহার করবে।
- Basic salary আর আলাদা করে double count হবে না: payhead lines থেকেই gross total হিসাব হবে।
- `payroll.basic_salary` field-এ Basic Salary line-এর amount রাখা হবে।
- `total_allowance` হবে House Rent + Conveyance + Medical + Bonus + Food/Increment etc.
- `total_deduction` হবে Early Out + manual deductions + loan/advance deduction।
- Net Salary = all addition lines - deduction lines - loan/advance।

### ৪. Monthly payhead কম-বেশি করার UI উন্নত করা
Payslip Manager-এর edit icon চাপলে:
- সব default payhead row দেখা যাবে, employee-র template select না থাকলেও।
- প্রতিটি row-তে `Base Amount` এবং `This Month Amount` থাকবে।
- `Add Payhead` dropdown থাকবে, যাতে extra bonus/deduction যোগ করা যায়।
- `Remove` থাকবে শুধু এই মাসের manual/extra row বাদ দেওয়ার জন্য।
- Save করলে শুধুমাত্র ওই মাসের adjustment `payroll.adjustments`-এ থাকবে এবং payslip regenerate হবে।

### ৫. Payroll template screen update
- Default payroll-এর payhead list percentage/formula অনুযায়ী readable হবে।
- Payhead assign করার সময় percentage value support থাকবে, যেমন 50%, 37.5%, 6.25%।
- Default template accidental empty থাকলে `Reset default payheads` action দিয়ে পুনরায় তৈরি করা যাবে।

### ৬. Print/Preview update
- Payslip preview/PDF-এ Basic Salary duplicated দেখাবে না।
- Default payhead split row-by-row পরিষ্কার দেখা যাবে।
- Monthly changed amount থাকলে সেটিই PDF-এ যাবে।

### Technical details
- Database migration লাগবে default payheads/template seed ও missing defaults backfill করার জন্য। নতুন table দরকার নেই।
- Existing tables ব্যবহার হবে: `payheads`, `payroll_templates`, `payroll_template_payheads`, `employees`, `payroll`।
- Code touch points:
  - `src/lib/payrollCompute.ts`
  - `src/pages/dashboard/hr/Payslip.tsx`
  - `src/pages/dashboard/hr/AddEmployee.tsx`
  - `src/pages/dashboard/hr/Payroll.tsx`
  - `src/components/hr/PayslipPrintView.tsx`
  - Supabase migration for default data/backfill