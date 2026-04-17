

## Default Roles Setup — Plan

ছবি অনুযায়ী ৩টা default role seed করব এবং এগুলোকে protected (non-editable, non-deletable) রাখব। শুধুমাত্র **Super Admin** এদের assign করতে পারবে।

### Default roles to seed
1. **Super Admin** — full access সব module
2. **Admin** — payment gateway settings ছাড়া সব access
3. **Employee** — শুধু নিজের HR/Payroll info (Salary Sheet, Payslip, Attendance, Leave Apply, Profile)

### DB changes (migration)
- `app_roles` table-এ ২টা নতুন column:
  - `is_default boolean default false` — system role চিহ্নিত করতে
  - `is_protected boolean default false` — edit/delete block করতে
- ৩টা role insert (id fixed UUID দিয়ে, idempotent)
- প্রতিটি role-এর জন্য `app_role_modules`-এ default permissions seed:
  - Super Admin → সব module + সব common permissions, full access
  - Admin → payment gateway group বাদে সব, full access
  - Employee → শুধু `HR & PAYROLL` group থেকে: Salary Sheet, Payslip, Attendance (read only) + Leave Apply

### UI changes (`src/pages/dashboard/system/Users.tsx`)

**1. Roles tab (table row level)**
- Default role row-এ "🔒 System" badge দেখাবে
- Edit/Delete button **hidden** যদি `is_protected = true` এবং current user super_admin না হয়
- Permission edit dialog open হলে warning: "এই role system default — modify করলে সব user প্রভাবিত হবে। শুধু Super Admin save করতে পারবে।"

**2. Application Users tab (assign role)**
- `Super Admin` role dropdown-এ **শুধুমাত্র super_admin user দেখতে পাবে** (filter logic in role select)
- Admin user → `Admin` + `Employee` + custom roles assign করতে পারবে, Super Admin না
- Other users → assign করতে পারবে না (button disabled)

**3. Permission gating helper**
- `useAuth()` থেকে `hasRole('super_admin')` ব্যবহার করে UI gate
- Backend safety: RLS policy `app_roles` table-এ — `UPDATE`/`DELETE` blocked when `is_protected = true` unless `has_role(auth.uid(), 'super_admin')`

### Files
- New migration: add columns + seed 3 roles + seed role_modules + RLS policy
- Edit `src/pages/dashboard/system/Users.tsx`:
  - Show `is_default`/`is_protected` badge
  - Hide edit/delete buttons for protected roles (non-super-admin)
  - Filter Super Admin from role dropdown for non-super-admin users
- Edit `src/pages/dashboard/system/UserReview.tsx`:
  - Same role dropdown filter

### Notes
- Existing `user_roles` table (super_admin/admin/operator enum) — auth-level role, থাকবে
- `app_roles` — UI-level granular permission group, এটাতেই default seed হবে
- দুইটা system আলাদা purpose serve করে; conflict নেই

