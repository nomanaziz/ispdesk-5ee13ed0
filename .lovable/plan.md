

## App User (এমপ্লয়ি লগইন এরিয়া) — Page + Menu ফিরিয়ে আনা

### বর্তমান অবস্থা

- **Database-এ সব ready**: `app_users`, `app_roles`, `app_role_modules` table আছে। ৩টা role এবং ২৮০টা module permission ইতোমধ্যে configured।
- **Translation dictionary-তে nameও আছে**: "অ্যাপ ইউজার", "রোল"।
- **কিন্তু**: কোনো sidebar entry নাই, কোনো route নাই, কোনো page file নাই — তাই menu খুঁজে পাচ্ছেন না।

(আলাদা concept মনে রাখবেন: HR > "কর্মচারী তালিকা" = employee master record। **App User** = সেই employee-কে ERP panel-এ login করার access দেওয়া + কোন menu access পাবে সেটা control করা। দুটো আলাদা।)

---

### কী বানাব

#### ১. নতুন sidebar group: **"অ্যাক্সেস ম্যানেজমেন্ট"** (HR group-এর ঠিক নিচে)

| Menu | Route | কাজ |
|------|-------|-----|
| অ্যাপ ইউজার | `/dashboard/access/app-users` | Employee-দের login credential তৈরি/manage |
| রোল ও পারমিশন | `/dashboard/access/roles` | Role create করা + কোন menu access পাবে check করা |

Icon: `ShieldCheck` (group), `Users` ও `Shield` (items)। Super Admin + Admin শুধু দেখবে।

#### ২. Page: `/dashboard/access/app-users` — `src/pages/dashboard/access/AppUsers.tsx`

- Table: Username | Employee (নাম + ID) | Role | Status | Last Login | Actions
- Top: Search + "নতুন App User" button + Status filter
- **Add/Edit dialog**:
  - Employee dropdown (dropdown থেকে existing employee select — `employees` table থেকে)
  - Username (auto-suggest employee_id, editable)
  - Password / Confirm Password (edit mode-এ blank = unchanged)
  - Role dropdown (`app_roles` থেকে)
  - Status: Active / Inactive
- **Actions**: Edit, Reset Password, Toggle Active/Inactive, Delete
- Password DB-তে hash হয়ে save হবে (bcrypt via edge function বা trigger — যেটা existing pattern-এ আছে সেটা reuse)।

#### ৩. Page: `/dashboard/access/roles` — `src/pages/dashboard/access/AppRoles.tsx`

- বাঁ পাশে: Role list (Super Admin, Admin, ইত্যাদি — `is_protected` দেখানো হবে badge দিয়ে), নিচে "নতুন রোল" button
- ডান পাশে: Selected role-এর জন্য **module permission tree** (`app_role_modules` থেকে load) — group → module → checkbox (View/Edit/Delete level)
- "সংরক্ষণ" button — `app_role_modules`-এ upsert
- Protected role (Super Admin) edit করা যাবে না — শুধু view
- **নতুন role create** dialog: Name + Default redirect URL + Status

#### ৪. Login flow integration (already partially done)

`src/pages/Login.tsx` ইতোমধ্যে username + password handle করে — `PortalAuthContext` দিয়ে। নিশ্চিত করব app_user login হলে:
- `/dashboard`-এ redirect হবে (role এর `redirect_url` থাকলে সেটা, না থাকলে default `/dashboard`)
- Role-এর permission অনুযায়ী sidebar items filter হবে (এটা পরের phase — এখন শুধু all access for valid app_user)

---

### Files to create / modify

| File | Action |
|------|--------|
| `src/pages/dashboard/access/AppUsers.tsx` | NEW — App user CRUD page |
| `src/pages/dashboard/access/AppRoles.tsx` | NEW — Role + permission management page |
| `src/components/AppSidebar.tsx` | "অ্যাক্সেস ম্যানেজমেন্ট" group যোগ |
| `src/App.tsx` | দুটো নতুন route যোগ |
| `src/contexts/PortalAuthContext.tsx` | Verify — app_user login already supports কিনা; না হলে handler যোগ |
| Supabase migration | (যদি দরকার) password hashing trigger / RLS policies for `app_users`, `app_roles`, `app_role_modules` admin-only access |

---

### Outcome

- Sidebar-এ **অ্যাক্সেস ম্যানেজমেন্ট → অ্যাপ ইউজার / রোল ও পারমিশন** এই menu আবার দেখা যাবে।
- Admin সেখান থেকে কোনো employee-কে username + password + role দিয়ে ERP panel-এ login access দিতে পারবে।
- Role-ভিত্তিক menu permission setup করা যাবে (database backend already ready)।
- যেই employee-এর App User account আছে, সে `/login`-এ গিয়ে username + password দিয়ে dashboard access করবে।

