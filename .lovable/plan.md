

## কাজ ৩টা — একসাথে

### ১) Build error fix (দ্রুত)
`ResellerProtectedRoute`-এর `require` prop type-এ `"system"` নেই, কিন্তু নতুন ১০টা route-এ `require="system"` ব্যবহার করা হয়েছিল।

**Fix:** `src/components/ResellerProtectedRoute.tsx`-এ type union-এ `"system"` যোগ করব এবং sub-user `permissions` interface-এ `system?: boolean` যোগ করব। `App.tsx`-এ ১০টা route ইতিমধ্যে `require="settings"` ব্যবহার করছে (build error message অনুযায়ী আগের সংস্করণে `"system"` ছিল) — এগুলো `require="system"` করব এবং নতুন `system` permission key যোগ করব।

### ২) POP Admin Basic Accounting (Income / Expense / Cash Book)

**Concept:** Bill collection automatically income → cash book। POP চাইলে manual income/expense add করতে পারবে। শেষে cash book-এ সব এক জায়গায়।

**Sidebar group (নতুন):** "হিসাব / Accounting"
- Income
- Expense  
- Cash Book

**Pages (নতুন `src/pages/reseller/accounting/`):**
| File | কী করবে |
|---|---|
| `PopIncome.tsx` | Auto income (bill_collections, branch-scoped) + manual income (income_entries) — list + Add dialog |
| `PopExpense.tsx` | Manual expense list (expense_entries, branch-scoped) + Add dialog (category, amount, date, payment method, note) |
| `PopCashBook.tsx` | Date-range filter; merged ledger: opening balance + all incomes (+) + all expenses (−) + closing balance; print/export ready |

**Data source — সব branch_id দিয়ে scope:**
- Auto income = `bill_collections WHERE branch_id = {pop branch}` (status='completed' or all paid)
- Manual income = `income_entries WHERE branch_id = {pop}`
- Expense = `expense_entries WHERE branch_id = {pop}`

**Routes:** 3টা নতুন `/pop-admin/accounting/{income|expense|cashbook}`, `require="accounting"` permission gate দিয়ে।

**Permission key:** `popPermissions.ts`-এ নতুন group `accounting` (3 items) যোগ করব।

### ৩) Employee → User Access (POP-only sub-user system)

Reference image-201: Employee form-এ **"HAS USER ACCESS?"** checkbox। Tick করলে নিচে username/password + POP Menus tree appear করবে। Save করলে employee POP-এর sub-user হিসেবে portal-এ login করতে পারবে — এবং শুধু selected menu গুলো দেখবে।

**Implementation:**

**Database (migration):**
- `employees` table-এ ৩টা column যোগ:
  - `has_user_access boolean default false`
  - `user_username text` (unique-ish per branch)
  - `user_password_hash text` (bcrypt via edge function, প্ল্যান নয় — সরাসরি লেখা plaintext-এর বদলে existing `branch_managers` pattern follow করব যেটায় কোলামটা `password` text — same approach reuse)
  - `user_permissions jsonb` (POP menu permission tree, same shape as `popPermissions`)

**`PopAddEmployee.tsx` overhaul** (image-199/200/201 অনুযায়ী):
- 3 sections: Employee information / Educational qualification / Posting information
- নতুন full field set (date_of_birth, gender, personal_phone, office_phone, guardian_phone, marital_status, nid_number, facebook_link, reference, district, upazila, present_address, permanent_address, working_experience, last_degree, institution, passing_year, joining_date, department, designation, salary, status, image upload, **has_user_access checkbox**)
- `has_user_access = true` হলে নিচে নতুন section render:
  - "Employee User Info": username / password / confirm password
  - "POP Menus": existing `<PermissionTreeSelector>` (image-201 অনুযায়ী 11 group checkbox) — same component already used for branch managers
- Save করলে: employee row + (যদি user access on) `branch_managers`-এ একটা **sub-user** entry তৈরি হবে (`type='reseller_sub'`, `parent_reseller_id={pop_id}`, `branch_id={pop branch}`, `permissions={selected menus}`)

**Login flow:** ইতিমধ্যে `portal-auth` edge function `reseller_sub` type support করে। নতুন কিছু না — শুধু sub-user row insert করলেই login কাজ করবে।

**Scope:** এই entire feature **শুধু POP admin portal-এ** apply হবে। Admin dashboard-এর `HrEmployees` page অপরিবর্তিত — সেটায় user access checkbox দেখাবে না।

**Edit existing:**
- `PopEmployees.tsx` — list-এ "User Access" badge column যোগ
- নতুন `PopEditEmployee.tsx` route + page (existing employees-এর জন্য user access toggle/permission edit)

## কোন file বদলাবে / নতুন

**Database migration:**
- `employees` table-এ user access column ৪টা যোগ

**নতুন (5 files):**
- `src/pages/reseller/accounting/PopIncome.tsx`
- `src/pages/reseller/accounting/PopExpense.tsx`
- `src/pages/reseller/accounting/PopCashBook.tsx`
- `src/pages/reseller/employee/PopEditEmployee.tsx`
- `src/components/reseller/EmployeeUserAccessSection.tsx` (reusable user-access form block)

**Edit:**
- `src/components/ResellerProtectedRoute.tsx` (type fix + `system`/`accounting` keys)
- `src/contexts/PortalAuthContext.tsx` (`ResellerPermissions` interface optional `system`/`accounting`)
- `src/pages/reseller/employee/PopAddEmployee.tsx` (full Galaxy-style form + user access section)
- `src/pages/reseller/employee/PopEmployees.tsx` (user access badge column + edit link)
- `src/components/ResellerLayout.tsx` (Accounting group যোগ sidebar-এ)
- `src/lib/popPermissions.ts` (`accounting` group + sync `system` keys)
- `src/App.tsx` (3 accounting routes + 1 employee edit route + 10 system routes-এ `require="settings"` → `"system"`)

## কোন file বদলাবে না
- Admin dashboard pages, RLS, MikroTik, billing logic, edge functions (login already handles `reseller_sub`)

## Apply-এর পরে expected ফলাফল
1. ✅ Build error gone — system routes কাজ করবে
2. ✅ POP admin sidebar-এ "হিসাব" group — Income/Expense/Cash Book functional, branch-scoped
3. ✅ Bill collection auto income হিসেবে cash book-এ আসবে
4. ✅ Add Employee page reference image-এর মত full form
5. ✅ "HAS USER ACCESS?" tick করলে username + permission tree show হবে
6. ✅ Save করলে employee portal login করতে পারবে — শুধু allowed menu দেখবে
7. ✅ এই সব শুধু POP admin-এ; admin dashboard untouched

