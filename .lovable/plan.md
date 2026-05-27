## পরিকল্পনা: Bulk Payslip PDF View + Download

### লক্ষ্য
Multiple employee select করে একসাথে সবার পে-স্লিপ একটি PDF-এ দেখা ও download করা — যেন print করে কেটে কেটে দেয়া যায়। Single employee-এর payslip preview-ও একই professional design-এ দেখাবে (screenshot reference অনুযায়ী)।

### ১. নতুন PayslipPrint component (`PayslipPrintView.tsx`)
Screenshot-এর design অনুযায়ী একটি print-friendly payslip card:
- হেডার: কোম্পানি নাম (branch name), "Pay Slip for the period of {Month-YY}", date range
- ডান কোনায়: status badge (Fully Paid / Partial / Unpaid) + Download PDF button
- Employee info grid (২ কলাম): Name, ID, Mobile, Pay Slip ID, Position, Joining Date
- Payheads table: Payheads | Unit | Type | Addition | Amount | Deduction | Amount (screenshot-এর মতোই)
- Totals row + Gross/Total Deduction/Net Salary footer table
- নিচে loan/advance deduction breakdown (যদি থাকে)
- Print CSS: A4 অর্ধেক পেজ প্রতি payslip → কেটে দেয়া সহজ

### ২. Bulk PDF generate
- Payslip Manager-এ নতুন button: **"Download PDF"** (selection থাকলে enable)
- Selected employee-দের জন্য PayslipPrintView গুলো একসাথে render করে browser-এর native print dialog খুলবে (window.print)
- Print CSS: প্রতিটি payslip-এর পরে `page-break-after: always` → কেটে দিতে সুবিধা
- "Save as PDF" option browser-এর print dialog থেকেই available
- Bulk preview modal: scroll করে আগে দেখা যাবে, তারপর print

### ৩. View action update
বর্তমান View button আগে শুধু প্রথম selected দেখায় — এটা update:
- ১ জন selected → ওই payslip preview
- একাধিক selected → bulk preview modal (সবার payslip একসাথে scroll করে দেখা যাবে)
- preview modal-এ "Download PDF" / "Print" button

### ৪. Single payslip preview redesign
বর্তমান ছোট preview dialog কে full payslip layout-এ replace — screenshot-এর design মতো। Status badge উপরে ডানে। Download PDF button থাকবে।

### ৫. PDF generation approach
External library নয় — browser native `window.print()` + dedicated `/dashboard/hr/payslip/print` route ব্যবহার:
- Print route URL: `/dashboard/hr/payslip/print?month=2025-12&ids=id1,id2,id3`
- নতুন tab-এ open → render → auto-trigger print dialog
- User চাইলে "Save as PDF" select করে PDF download করবে
- Print-only CSS: sidebar/header hide, প্রতিটি payslip পেজে আলাদা

### ফাইলসমূহ
- নতুন: `src/components/hr/PayslipPrintView.tsx` — single payslip layout
- নতুন: `src/pages/dashboard/hr/PayslipPrint.tsx` — print-ready route (auto print)
- নতুন: `src/components/hr/BulkPayslipPreview.tsx` — multi-employee scroll preview modal
- Edit: `src/pages/dashboard/hr/Payslip.tsx` — View/Download PDF button update, single preview redesign
- Edit: `src/App.tsx` — print route যোগ
- Edit: `src/index.css` — `@media print` rules যোগ (page-break, hide chrome)

### ব্যবহার
1. মাস select → checkbox দিয়ে multiple employee select
2. **View** click → modal-এ scroll করে সবার payslip দেখা
3. **Download PDF** click → নতুন tab-এ all payslips print-ready render হয়ে print dialog খুলবে → "Save as PDF" → একটি PDF download → প্রিন্ট করে কেটে দিন

Plan approve করলে এই অনুযায়ী implement করব।