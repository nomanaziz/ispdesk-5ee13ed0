

## লক্ষ্য
গ্রাহক পোর্টালে নতুন **"Change/Update"** section যোগ করা, যেখানে গ্রাহক ৩ ধরনের request পাঠাতে পারবে:
1. **Package Change** — package migrate/update
2. **Billing Date Change** — পরবর্তী cycle থেকে নতুন billing date
3. **Billing Date Extend** — শুধু এই মাসের জন্য expire date বাড়ানো

আর **Company Info** sidebar থেকে সরিয়ে Dashboard-এর নিচে **default-ভাবে show** করা।

---

## সমাধান

### 1. নতুন page `/portal/change-request` (3-tab interface, image reference থেকে)

**File: `src/pages/portal/PortalChangeRequest.tsx`** *(new)*

Header card: paper-plane icon + "Migrate/Update Package" + helper text।

৩টা tab:

#### Tab A: **Package Change Request**
- "Current Package: [Advance+(40)]" (badge সহ) + ডানে **"+ Change Request"** button
- Button click → Dialog খুলবে:
  - Package selector (admin-এ active + current package বাদে সব)
  - Reason/Note textarea (optional)
  - Submit → `change_requests` insert (`request_type='package'`, `old_value=current_pkg_name`, `new_value=new_pkg_name`)
- নিচে table: Current Package · Requested Package · Occurred Date · Remarks · Action (Status badge + Cancel button যদি pending হয়)

#### Tab B: **Billing Expiry Date Change** (পরের cycle থেকে date বদলাবে)
- Current billing date (e.g., "প্রতি মাসের ১০ তারিখ") দেখাবে
- "+ Change Request" → Dialog:
  - নতুন day-of-month select (1-28)
  - Reason
  - Submit → `change_requests` (`request_type='billing_date'`, `old_value=current_day`, `new_value=new_day`)
- নিচে history table

#### Tab C: **Billing Expiry Date Extend** (শুধু চলতি মাসের জন্য)
- Current expire_date দেখাবে
- "+ Change Request" → Dialog:
  - নতুন expire date picker (চলতি মাসের মধ্যে, max 28 দিন বৃদ্ধি)
  - Reason (required এই tab-এ)
  - Submit → `change_requests` (`request_type='date_extend'`, `old_value=current_expire`, `new_value=new_expire`)
- নিচে history table

প্রতিটা tab-এর table-এ Status badge: 🟡 Requested · 🟢 Approved · 🔴 Rejected। Pending হলে Cancel button (status='cancelled')।

### 2. Backend — `portal-data` edge function-এ ৩টা নতুন action

**File: `supabase/functions/portal-data/index.ts`**

- `list_change_requests` — `change_requests` table থেকে `client_id = tok.sub`-এর সব request, joined isp_packages name সহ
- `create_change_request` — payload: `{request_type, old_value, new_value, reason}` → insert with `status='pending'`
- `cancel_change_request` — payload: `{id}` → update `status='cancelled'` যদি সেই client-এর pending request হয়

### 3. Admin দিকে existing `ChangeRequest.tsx` page **already supports** `package` / `billing_date` / `status` types। শুধু `date_extend` type approve handler-এ যোগ করব:
- approve হলে: `date_extend` → `clients.expire_date = new_value` update
- `package` → existing manual flow (admin profile change কাজ করবে)
- `billing_date` → `clients.billing_date = new_value` update

**File: `src/pages/dashboard/clients/ChangeRequest.tsx`** — approve mutation-এ side-effect SQL update যোগ + filter dropdown-এ `date_extend` option।

### 4. Sidebar nav-এ নতুন item

**File: `src/components/PortalLayout.tsx`**
- "Change/Update" entry (paper-plane / Send icon, teal color), path `/portal/change-request`
- Bottom nav-এ "নোটিশ"-এর জায়গায় "Change" রাখব না — sidebar-ই যথেষ্ট
- **"Company Info" entry সরিয়ে দেব** sidebar থেকে (default-ভাবে dashboard-এ embed হবে)

### 5. Route registration

**File: `src/App.tsx`**
- `/portal/change-request` → `PortalChangeRequest`
- `/portal/company` route রাখব (direct link থাকলে কাজ করবে), শুধু sidebar entry সরাবো

### 6. Dashboard-এ Company Info embed (default show)

**File: `src/pages/portal/PortalDashboard.tsx`**
- পুরো dashboard-এর **শেষে** একটা compact "About Your ISP" card যোগ:
  - Logo + company name + tagline (gradient header)
  - Quick info grid: Hotline · Address · Email · Website (icon + value)
  - "View Full Info →" link (যদি বেশি details থাকে → `/portal/company`)
- Data source: existing `get_company` action (already exists)
- Compact version, full page-এর ছোট রূপ

---

## Technical Details

### Database
- `change_requests` table **already exists** (id, client_id, request_type, old_value, new_value, reason, status, approved_by, approved_at, created_at)
- কোনো schema change লাগবে না
- `request_type` values: `'package'`, `'billing_date'`, `'date_extend'` (existing `'status'` ও থাকবে admin-এর জন্য)
- **Migration ছোট একটা**: `status='cancelled'` allow করার জন্য existing CHECK constraint থাকলে update (যদি না থাকে — text column, কিছু লাগবে না)

### Validation rules (frontend + edge function-এ duplicate)
- **Package**: same package select করা যাবে না; pending request থাকলে নতুন পাঠানো যাবে না
- **Billing date change**: 1-28 range
- **Date extend**: নতুন date > current expire; max +28 দিন; এই মাসে একবারই allowed (pending+approved last 30 days check)

### UI patterns
- Reference image-এর দরকারি concept: tabs · current state badge · "+ Change Request" CTA · clean table with status pill — design fresh, copy নয়
- Existing colorful tints, dark text (per memory)
- Mobile (390px): tabs scrollable, table → card list

---

## Files Modified/Created

| File | Type |
|---|---|
| `src/pages/portal/PortalChangeRequest.tsx` | **new** |
| `supabase/functions/portal-data/index.ts` | modify (3 new actions) |
| `src/pages/dashboard/clients/ChangeRequest.tsx` | modify (approve handler + new type filter) |
| `src/components/PortalLayout.tsx` | modify (add Change item, remove Company Info) |
| `src/App.tsx` | modify (register route) |
| `src/pages/portal/PortalDashboard.tsx` | modify (embed Company Info card at bottom) |

---

## Out of scope
- Auto MikroTik profile push on package approve (admin manual approve flow আগের মতই থাকবে)
- Email/SMS notification on approval (future)
- Multi-month date extension

---

## Apply-এর পরে expected
1. গ্রাহক sidebar-এ "Change/Update" দেখবে → ৩-tab page থেকে যেকোনো request পাঠাতে পারবে
2. Admin existing `Client > Change Request` page থেকে approve/reject করলে `clients` table আপডেট হয়ে যাবে (date_extend & billing_date এর জন্য)
3. গ্রাহক history-তে নিজের সব request দেখবে (pending হলে cancel option)
4. Dashboard-এর নিচে by default Company Info card visible — sidebar থেকে আলাদা entry আর নেই

