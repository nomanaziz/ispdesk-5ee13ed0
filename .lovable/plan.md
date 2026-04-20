

## লক্ষ্য
POP create/edit flow পুরোপুরি ঠিক করা — ৪টা মূল কাজ:

1. **Edit page বানানো** — এখন edit click করলে view (PopProfile) page খুলছে। AddManager-কে reusable করে `EditManager` route বানাব।
2. **Form simplify + mandatory enforce** — অপ্রয়োজনীয় field সরানো, mandatory validation যোগ
3. **Edit-এ field lock** — tariff/POP code/prefix employee change করতে পারবে না (admin পারবে)
4. **POP type change daily limit** — দিনে সর্বোচ্চ ১ বার prepaid↔postpaid toggle

## ১. Routing Fix

`Managers.tsx` লাইন ২৫৩-এ `onEdit` → `pop/${m.id}` (PopProfile) যাচ্ছে। এটা পরিবর্তন করে নতুন route-এ পাঠাব:
- ➕ Route: `/dashboard/branches/edit-manager/:id` → `EditManager` page
- ✏️ `Managers.tsx`: `onEdit` → `/dashboard/branches/edit-manager/${m.id}`
- ✏️ `PopProfile.tsx`: "Update" button → একই edit route

## ২. Form Refactor (AddManager + EditManager)

**Approach**: AddManager-এর form-কে একটা shared component `<PopForm mode="create"|"edit" />` বানাব। Internally সব logic shared, শুধু mode-based behavior differ করবে।

### সরানো হবে (delete fields):
- ❌ **Branch / POP Location** dropdown (`branch_id`) — confusion creates, সরাব
- ❌ "POP Code (auto)" manual input — পুরোপুরি auto-generated, form-এ দেখানো হবে না (create-এ); edit-এ readonly chip হিসেবে দেখাব

### Mandatory fields (red asterisk + validation):
- Contact Person Name
- Email
- Mobile  
- District
- Upazila (Thana)
- Address
- POP / Business Name
- POP Prefix
- POP Type
- Tariff (create-এ)
- Min Recharge (default **500**, screenshot অনুযায়ী)
- Username, Password, Confirm Password (create-এ)

### Optional fields:
- Phone, National ID, Zone, Logo, Min Balance

### Default switches (text update — user-এর exact wording):
- **"Auto-disable clients on low balance"** (default ON) — "যদি আপনি POP balance শেষ হয়ে গেলে সব client off হবে?"
  - Yes → balance ≤ min_balance হলে clients disable
  - No → কখনো disable হবে না (zero হলেও না)

### POP Type → Fund auto-start logic:
- **Prepaid** select: form-এ একটা notice দেখাব — "Admin fund start না করা পর্যন্ত POP client create করতে পারবে না"
  - Save-এ `fund_started = false` (default)
- **Postpaid** select: notice — "Postpaid POP সরাসরি client create করতে পারবে"
  - Save-এ `fund_started = true` auto

## ৩. Edit Mode — Field Lock (Role-based)

`EditManager` page-এ user role check করব (`has_role(auth.uid(), 'admin'|'super_admin')`):

| Field | Employee | Admin/Super Admin |
|---|---|---|
| Tariff | 🔒 readonly | ✏️ editable |
| POP Code | 🔒 readonly | ✏️ editable |
| POP Prefix | 🔒 readonly | ✏️ editable |
| Username | 🔒 readonly | ✏️ editable |
| বাকি সব | ✏️ editable | ✏️ editable |
| Password | আলাদা "Reset Password" dialog (existing) দিয়ে | একই |

Lock indication: locked field-এ small 🔒 icon + tooltip "Admin only — change করতে admin-এর সাথে যোগাযোগ করুন"

**Cascade update**: Admin যদি `pop_code` বা `pop_prefix` change করে, সব related table-এ same value update হবে — যেহেতু `branch_managers.id` foreign key, code/prefix value-by-value কোথাও copy করা থাকলে সেটাও update দরকার। আমরা বর্তমান schema check করে যেসব table-এ pop_code/pop_prefix copy আছে সেগুলো trigger বা explicit UPDATE দিয়ে sync করব। (Initial implementation: একটা simple SQL function `sync_pop_code_change()` যা `clients` ও সংশ্লিষ্ট table-গুলোয় cascade করবে, যদি ওখানে denormalized copy থাকে। প্রথম pass-এ শুধু `branch_managers` row update — পরে discovery করে cascade যোগ করব।)

## ৪. POP Type Daily Toggle Limit

**Database**:
- ➕ `branch_managers` table-এ নতুন column: `pop_type_changed_at TIMESTAMPTZ`
- ➕ Trigger `enforce_pop_type_daily_limit()` — `pop_type` change হলে check করবে: `pop_type_changed_at`-এর date == today হলে exception throw করবে: "একই দিনে POP type একবারই পরিবর্তন করা যায় — পরের দিন আবার চেষ্টা করুন"
- Trigger update করার সময় `pop_type_changed_at = now()` set করবে

এতে UI-তে যেখান থেকেই (Managers list switch / PopProfile button / Edit form) toggle হোক, DB-level guard কাজ করবে। UI-তে ভাল error message toast দেখাব।

## ৫. ফাইল পরিবর্তন

### Database Migration
- ➕ `branch_managers` → নতুন column `pop_type_changed_at`
- ➕ Trigger function `enforce_pop_type_daily_limit()` + BEFORE UPDATE trigger

### Code
- ➕ `src/components/branches/PopForm.tsx` — shared form (create + edit mode)
- ✏️ `src/pages/dashboard/branches/AddManager.tsx` — `<PopForm mode="create" />` দিয়ে replace
- ➕ `src/pages/dashboard/branches/EditManager.tsx` — নতুন page, `<PopForm mode="edit" pop={data} />`
- ✏️ `src/App.tsx` — নতুন route যোগ
- ✏️ `src/pages/dashboard/branches/Managers.tsx` — `onEdit` → edit route
- ✏️ `src/pages/dashboard/branches/PopProfile.tsx` — "Update" button → edit route
- ✏️ `src/hooks/usePermission.ts` (যদি না থাকে create) — `useIsAdmin()` helper যোগ

## কী **হবে না**
- পুরাতন data touch হবে না; existing POP-এর `branch_id` যেমন আছে DB-তে রয়ে যাবে (শুধু form থেকে input সরালাম)
- PopProfile (view) page অপরিবর্তিত
- Permission tree অপরিবর্তিত

