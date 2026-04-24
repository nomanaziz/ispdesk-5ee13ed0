## Goal

Leave Management পুরোটা **HR & Payroll**-এর under নিয়ে যাওয়া, ৪টা আলাদা page-কে **একটা unified page**-এ merge করা (dialog/tab দিয়ে), department/designation-ভিত্তিক leave allocation যোগ করা, এবং ৬টা default leave category seed করা।

---

## ১. Database changes (migration)

**Seed 6 default leave categories** (idempotent — already-existing names skip):
- Earn Leave, Religious Holidays, Unpaid Leave, Maternity Leave, Casual Leave, Sick Leave

**নতুন table — `leave_policies`** (designation/department-ভিত্তিক default allocation):
```
id uuid pk
scope_type text  -- 'department' | 'designation'
scope_id uuid    -- departments.id or designations.id
category_id uuid -> leave_categories
days_allowed int
created_at timestamptz
unique (scope_type, scope_id, category_id)
```
RLS: authenticated users select/insert/update/delete (project-এর existing pattern অনুযায়ী)।

কোনো বর্তমান page বা data delete হবে না।

---

## ২. Sidebar restructure

`AppSidebar.tsx`:
- "**ছুটি ম্যানেজমেন্ট**" group পুরোপুরি **সরিয়ে** "HR ও পেরোল" group-এ একটি single item হিসেবে যুক্ত হবে:
  - `{ title: "ছুটি ম্যানেজমেন্ট", url: "/dashboard/hr/leave", icon: CalendarDays }`
- পুরনো `/dashboard/leave/*` route-গুলো App.tsx-এ থাকবে কিন্তু সব একই unified page-এ redirect/render হবে (backward compatibility)।

---

## ৩. Unified Leave page — `src/pages/dashboard/hr/LeaveManagement.tsx`

একটাই page, ৪টা **tab**:

### Tab 1 — Overview / আবেদন (default)
- কর্মীর নিজের balance cards (Earn / Sick / Casual ইত্যাদি)
- "নতুন আবেদন" button → **dialog** (employee select + category + dates + reason)
- নিজের submitted application list (table)
- Admin/HR হলে সব employee-এর application + status filter দেখাবে

### Tab 2 — ক্যাটাগরি (admin only)
- বর্তমান `Categories.tsx`-এর content inline → table + add/edit dialog

### Tab 3 — Policy / Setup (admin only)  **[নতুন + পুরাতন merge]**
দুটি sub-section একই page-এ:

**(a) Department/Designation Policy** — uploaded image-এর "Assign a Leave Category" UI অনুযায়ী:
- Designation/Department list (left)
- Row click করলে right-এ "Assigned Leave Category" table খুলবে
- Dropdown (category) + input (days) + "Assign Leave Category" button
- Inline edit/delete per row
- → `leave_policies` table-এ save

**(b) Per-employee yearly allocation** — বর্তমান `Setup.tsx`-এর functionality:
- Year selector + employee-wise balance grid
- "সকল কর্মী বরাদ্দ" — এখন প্রথমে policy থেকে designation/department-এর days নেবে, না থাকলে category default
- "একক বরাদ্দ" dialog আগের মতই

### Tab 4 — অনুমোদন (admin only)
- বর্তমান `Approval.tsx`-এর content inline (KPI cards + table + approve/decline action)

Tabs admin role-অনুসারে hide/show হবে (`useAuth().isAdmin`)।

---

## ৪. Routes (`App.tsx`)

- নতুন: `/dashboard/hr/leave` → `<LeaveManagement />`
- পুরনো `/dashboard/leave/categories|setup|apply|approval` → একই `<LeaveManagement />` render করবে (initial tab query param থেকে)। কোনো 404 হবে না।

---

## ৫. Files

**New:**
- `supabase/migrations/<ts>_leave_policies_and_seed.sql`
- `src/pages/dashboard/hr/LeaveManagement.tsx` (unified, tab-based)
- `src/components/leave/PolicyEditor.tsx` (designation/department × category matrix)

**Modified:**
- `src/components/AppSidebar.tsx` — remove leave group, add single item under HR
- `src/App.tsx` — add new route, point old leave routes to unified page

**Kept (untouched, used as building blocks via internal imports/reuse):**
- পুরনো 4টা page file delete হচ্ছে না — তবে sidebar থেকে hidden, এবং unified page-এ logic re-implement।

---

## Out of scope

- Maternity-leave specific gender/eligibility validation
- Leave calendar visualization
- Email/SMS notification on apply/approve
