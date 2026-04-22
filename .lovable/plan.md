

## Fix: POP Employee Add/Edit — column mismatch

### সমস্যা
`employees` table-এ `department_id` (uuid → `departments.id`) আর `position_id` (uuid → `positions.id`) আছে। কিন্তু কোড `department` / `designation` (text name) পাঠাচ্ছে — এই column গুলা table-এ নাই। তাই Edit save করলে error: *Could not find the 'department' column*।

দ্বিতীয় সমস্যা: `PopEmployees` list-এ `positions(name)` join করা — এটা ঠিক, কিন্তু FK relation না থাকলে fail করতে পারে। (DB-তে `position_id` আছে, FK check করব migration লাগবে কিনা।)

### সমাধান

#### ১) `BranchScopedSelect` — value হিসেবে ID return করবে
- Query থেকে `id, name` দুটোই select
- `value` prop = uuid, dropdown-এ `name` দেখাবে কিন্তু `<SelectItem value={id}>`
- `onChange(id)` — parent UUID পাবে
- "Add new"-এর পর insert করে নতুন row-এর `id` return করে select set হবে

#### ২) `PopEditEmployee.tsx`
- `form.designation` / `form.department` → `form.position_id` / `form.department_id`
- `useEffect` initializer-এ `(emp as any).position_id` ও `department_id` পড়বে
- `update` payload: `department_id`, `position_id` পাঠাবে — পুরোনো `designation`/`department` key বাদ
- `BranchScopedSelect` কে UUID value pass করবে

#### ৩) `PopAddEmployee.tsx`
- Form state: `department: ""` → `department_id: null`, `designation: ""` → `position_id: null`
- Payload: `department_id`, `position_id` পাঠাবে
- Edge function-এ already `...p` spread হয়, তাই নতুন key গুলা ঠিক column-এ যাবে

#### ৪) Edge function `create_employee` (safety)
- `...p` spread-এর পর explicitly delete ক্ষতিকর/নাই key (`department`, `designation`) যদি কোথাও থেকে আসে — protective strip

#### ৫) `PopEmployees.tsx` list verify
- `positions(name)` / `departments(name)` join — FK exists কিনা check করে দরকার হলে FK migration:
  ```sql
  ALTER TABLE employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id),
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES positions(id);
  ```
  (যদি ইতিমধ্যেই থাকে → skip)

### Files to edit
- `src/components/reseller/BranchScopedSelect.tsx` — return id instead of name
- `src/pages/reseller/employee/PopEditEmployee.tsx` — use `department_id` / `position_id`
- `src/pages/reseller/employee/PopAddEmployee.tsx` — same
- `supabase/functions/portal-data/index.ts` — strip stale keys in `create_employee`
- Migration (conditional) — add FKs যদি missing

### ফলাফল
- Edit save করলে আর error আসবে না
- Add করলে department/designation correctly save হবে
- List page-এ join properly resolve হবে

