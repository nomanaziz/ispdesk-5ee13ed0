# Payslip Manager — View Rules + আগের কাজ verify

## পরিবর্তন

### 1. Payslip Manager এ "View Rules" সংযোজন
বর্তমান page-এ `View Rules »` বাটনটা শুধু Payroll page-এ navigate করে। Screenshot এর মত একটা **collapsible 10-পয়েন্ট rules panel** যোগ করব যা page-এ inline দেখা যাবে।

বাটনে ক্লিক করলে নিচের ১০টা নিয়ম toggle হবে:

1. You can generate Payslip for **Last Not generated or Last Canceled Period** only.
2. Only **Previously Generated** and **Unpaid** period can be **Regenerate**.
3. Generate a payslip will calculate payhead's amount from **current employee payheads**.
4. Regenerate a payslip will calculate payhead's amount from **previously generated payheads** for that period.
5. Before generate a payslip you can always go to **Payslip Generation Settings** (link → `/dashboard/hr/settings` → Payslip tab) and change permission for **Late fee, Early out fee & Overtime fee**.
6. You can **Cancel** a payslip, if that payslip is **not paid** yet.
7. You can **Update** a payslip, if that payslip is paid **partially** — recalculate timing fees until fully paid.
8. If you make any mistake selecting a period, continue with the **Correctly Selected Employee**.
9. All **Previously Generated** and **not Canceled** payslips can be viewed.
10. You can see Paid & Generated status for each period by clicking **View More**.

### 2. "Assign a PayHead" verify
দ্বিতীয় screenshot এর dialog (Basic Salary, Bonus, Early Out, Conveyance, Medical, House Rent — Addition/Deduction + Percentage/Amount) — এটা ইতিমধ্যে `Payroll.tsx` এর "Assign PayHead" dialog এ আছে এবং কাজ করছে।

verify করব:
- Default template ("Monthly Payroll") এ ৬টা payhead seed হয়েছে কিনা (আগের migration থেকে)
- Dialog এ helper text যোগ: *"Provide Late Fee, Early Out fee & Overtime fee amount as per hour."*
- কোনো gap থাকলে minor fix

## ফাইল
- `src/pages/dashboard/hr/Payslip.tsx` — View Rules toggle panel
- `src/pages/dashboard/hr/Payroll.tsx` — Assign PayHead dialog এ helper hint যোগ (cosmetic)

কোনো DB migration লাগবে না।
