# Employee → App User দ্রুত Conversion + Default Employee Role

## সমস্যা
1. **App Users** পেজে Employee dropdown খালি দেখাচ্ছে — কারণ `AppUsers.tsx` `status='Active'` (বড় হাতের A) দিয়ে filter করছে, কিন্তু `employees` table-এ সব status = `active` (ছোট হাতের a)।
2. Employee থেকে app user বানাতে এখন Access > App Users-এ গিয়ে manually সব fill করতে হয় — slow।
3. কোনো employee app_user হলে তার Department/special role (Billing, HR ইত্যাদি) থাকুক বা না থাকুক, **Employee self-service permissions** (food order, conveyance, attendance, payslip, leave) সবসময় থাকা উচিত। এখন একটাই `role_id` রাখা যায়, তাই common Employee permissions হারিয়ে যায়।

## সমাধান

### 1. Employee dropdown বাগ ফিক্স (`AppUsers.tsx`)
- Filter বদলাবে: `.eq("status","Active")` → `.ilike("status","active")` (case-insensitive)
- যেসব employee-র ইতিমধ্যে app_user আছে তাদের dropdown থেকে hide করব (duplicate ঠেকাতে), edit mode-এ current employee দেখা যাবে

### 2. "App User বানান" কুইক বাটন
- **EmployeeView.tsx** এবং **Employees list** পেজে একটা `App User বানান` বাটন
- ক্লিক করলে modal খুলবে — username (default: employee_id বা name slug), password, confirm password, role (default: Employee)
- Submit করলে `app_users` row তৈরি, `employee_id` link হবে, একই সাথে Supabase auth user create হবে (যদি email থাকে) — supabase edge function বা existing flow ব্যবহার
- যদি আগেই app_user থাকে তাহলে button-এ `App User আছে` দেখাবে, ক্লিক করলে edit খুলবে

### 3. Default "Employee" role auto-attach
Schema change ছাড়া সহজ approach:
- **নতুন junction table** `public.app_user_extra_roles (user_id uuid, role_id uuid)` — multi-role support
- Trigger: কোনো `app_users` row insert হলে যদি linked `employee_id` থাকে, তাহলে automatic ভাবে Employee role-এর entry `app_user_extra_roles`-এ ঢুকবে (যদি primary role অন্য কিছু হয়)
- **Helper view** `public.app_user_effective_modules` — primary role এর modules + extra roles এর modules union, যাতে UI/sidebar এক জায়গা থেকে effective permissions পড়তে পারে
- UI-তে App User edit dialog-এ "অতিরিক্ত Role" multi-select যোগ হবে (Billing, HR, Accounts, Technician ইত্যাদি)

### 4. AppUsers list-এ visual
- প্রতিটি row-এ primary role-এর পাশে badge হিসেবে extra roles দেখাবে (e.g., `Employee + Billing`)

## টেকনিক্যাল

### Migration
```sql
CREATE TABLE public.app_user_extra_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);
-- GRANT + RLS (admin manage, self read)

-- Trigger: app_users insert হলে যদি employee_id != null এবং primary role != Employee,
-- তাহলে Employee role auto-add app_user_extra_roles-এ

-- View: app_user_effective_modules — union of primary role's app_role_modules
-- + extra roles' app_role_modules, with enabled=true
```

### Files
- `src/pages/dashboard/access/AppUsers.tsx` — status filter fix, exclude already-converted employees, extra_roles multi-select UI, badges
- `src/pages/dashboard/hr/EmployeeView.tsx` — "App User বানান" বাটন + dialog (AppUsers create dialog reuse)
- `src/pages/dashboard/hr/Employees.tsx` (যদি list থাকে) — row action: "App User বানান"
- নতুন component: `src/components/hr/ConvertToAppUserDialog.tsx`

## Scope বহির্ভূত
- Effective permissions দিয়ে actual page-level enforcement (Sidebar gating) — পরের আলাদা task
- Catering order, Leave management-এর full UI — আগেই আলাদা plan

## প্রশ্ন
1. "App User বানান" ক্লিক করলে কি **password manually** দেবেন, না-কি system auto-generate করে SMS/Email-এ পাঠাবে? (এখন manual ধরে এগোচ্ছি)
2. একই employee-র জন্য কি **একাধিক app_user** allow করব, না one-to-one strict?