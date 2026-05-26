## পরিকল্পনা: Payslip Payment + Advance Salary + Loan Management

### ১. Payslip Pay Dialog (`PayslipPaymentDialog.tsx` — নতুন)
Payslip-এর "Pay" button click করলে modal খুলবে (আপনার screenshot অনুযায়ী):
- **Total Payable / Total Paid / Pay Left** তিনটি স্ট্যাট
- Radio: **Pay Full** / **Pay Partially**
- `Pay` amount + `From` (cash/bank account select)
- `Payment Date`, `Remarks`, `Send SMS` checkbox
- Partial pay হলে payroll status → `partial`, full হলে → `paid`
- প্রতিটি payment আলাদা row হিসেবে track হবে → multiple partial payments allowed

### ২. Advance Salary Module (`AdvanceSalary.tsx` — নতুন page)
Menu: HR → **Advance Salary**
- Employee select → Amount → Date → Reason → Approve/Reject
- Status: pending / approved / paid / adjusted
- **পরবর্তী মাসের payslip generate করার সময় approved advance auto-deduct** হবে (একবারে full amount minus)

### ৩. Employee Loan Module (`EmployeeLoans.tsx` — নতুন page)  
Menu: HR → **Loans**
- Employee select → Loan amount → Installments (3/4/6 মাস) → Start month
- Auto-calculate: `monthly_installment = loan_amount / installments`
- Status: active / completed / cancelled
- **প্রতি মাসে payslip generate করার সময় installment auto-deduct** যতক্ষণ না সব installment শেষ হয়
- Loan ledger: কত মাস paid, কত বাকি, remaining balance

### ৪. Payroll Generate Integration
`payrollCompute.ts`-এ generate flow update:
1. Base salary + payheads + attendance deduction (আগের মতো)
2. **Minus**: ওই মাসের loan installment (active loans থেকে)
3. **Minus**: previous month-এর approved advance (যদি adjusted না হয়ে থাকে)
4. Net payable = final amount
Payslip row-এ আলাদা breakdown দেখাবে: Gross / Loan Deduction / Advance Adjustment / Net

### ৫. Employee View Page Integration
EmployeeView-এ নতুন tab:
- **Advance History** — সব advance request ও status
- **Loan History** — active/completed loans, installment progress bar

### Database Migration
নতুন ৩টি table:

**`payroll_payments`** — partial/full payment tracking  
fields: payroll_id, amount, payment_date, paid_from (account), remarks, sms_sent

**`advance_salary`**  
fields: employee_id, amount, request_date, reason, status, approved_by, adjusted_in_month

**`employee_loans`**  
fields: employee_id, loan_amount, installments, monthly_installment, start_month, status, remaining_balance

**`loan_installments`** (ledger)  
fields: loan_id, month, amount, payroll_id, status

Payroll table-এ যোগ: `paid_amount numeric`, `payment_status text` (unpaid/partial/paid), `loan_deduction numeric`, `advance_deduction numeric`

### Routing
- `/dashboard/hr/advance-salary`
- `/dashboard/hr/loans`
- Sidebar HR menu-তে দুটো নতুন item

### ফাইলসমূহ
- নতুন: `PayslipPaymentDialog.tsx`, `AdvanceSalary.tsx`, `EmployeeLoans.tsx`, `AdvanceDialog.tsx`, `LoanDialog.tsx`
- Edit: `Payslip.tsx` (Pay button → dialog), `payrollCompute.ts` (loan/advance deduction), `EmployeeView.tsx` (২টি tab), `App.tsx` (route), sidebar config
- Migration: ৪টি table + payroll column add

প্ল্যান approve করলে আগে migration submit করব, তারপর code লিখব।