

## কাজ — POP Admin: Allotted areas display + default seeds + Excel bulk import

### ১) Assigned Districts/Upazilas POP-এর কাছে দৃশ্যমান করা

Admin PopAllotment-এ POP-এর জন্য `pop_district_assignments` table-এ districts/upazilas store হয়। POP নিজে এটা দেখতে পাচ্ছে না।

**ফিক্স:**
- নতুন read-only page **`/pop-admin/my-areas`** → `PopMyAreas.tsx`
  - Sidebar-এ "আমার এরিয়া / My Allotted Areas" link (MapPin icon)
  - Table: District | Upazilas (chips) | Default? badge
  - Source: `pop_district_assignments` joined with `districts`+`upazilas`, plus default district/upazila from `branch_managers`
  - Empty state: "Admin আপনার জন্য কোনো এরিয়া assign করেননি। Admin-কে যোগাযোগ করুন।"
- POP Dashboard-এ একটা ছোট **"Assigned Areas" widget card** যোগ — top 3 districts + "View all" link

### ২) প্রতিটি POP create-এর সময় default Department / Designation / Zone seed

বর্তমানে `departments` + `zones` table আছে (branch-scoped)। `designations` table নেই — `employees.designation` simple text। তাই designation-এর জন্য নতুন `designations` table দরকার।

**Migration:**
```sql
CREATE TABLE public.designations (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id uuid REFERENCES branches(id),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE designations ENABLE RLS;
-- branch-scoped policies (admin all, POP own branch)
```

**Default seed function:** `seed_pop_defaults(branch_id uuid)` SQL function যা insert করে only-if-not-exists:
- Departments: **Admin**, **Technician**
- Designations: **Manager**, **Technician**
- Zones: **Default Zone**

**Trigger কোথায়:**
- যখন admin নতুন POP create করে (`branches` insert) → after-insert trigger → seed function call
- Existing POPs-দের জন্য one-time backfill query (migration-এ): সব branches-এর জন্য `seed_pop_defaults(id)` call, আগে থেকে যেগুলো আছে সেগুলো skip হবে

**Frontend:** PopAddEmployee + PopEditEmployee-এ Department & Designation এখন text Input → Select dropdown (branch-scoped, "+ নতুন" option যা inline create করে)। `PopDesignations.tsx` config page already exists — সেটা enable করব designations CRUD-এর জন্য।

POP চাইলে এই default গুলো যেকোনো সময় delete/edit করতে পারবে (existing config pages থেকে)।

### ৩) POP-এর Excel-based Bulk Client Import (image-204 অনুযায়ী)

বর্তমান `/pop-admin/mikrotik-users/bulk-create` শুধু MikroTik-transferred users থেকে create করে — Excel upload নেই। নতুন একটা parallel page বানাব।

**নতুন page: `/pop-admin/clients/bulk-import` → `PopBulkClientImport.tsx`**

Layout (image-204 অনুযায়ী):

**উপরের section — Tab/Toggle:**
- "MikroTik Bulk Create" (existing page-এ link)
- "Bulk Clients Import" (current — Excel-based)

**Instructions panel** (collapsible "Learn How to Import Clients..." toggle):
1. Upload-করা data ২৪ ঘণ্টা পরে আর available থাকবে না
2. MikroTik client available কিনা check করুন
3. Zone create করুন (Configuration → Zones)
4. Package create করুন (Configuration → Packages)
5. Bill Period activate (System → Bill Period)
6. Employee create করুন (যদি দরকার থাকে)
7. Sample Excel download করুন
8. Sample fill করে upload করুন
9. Upload-এর পর invalid row edit/delete করুন
10. "Transfer to Client List" → save

**4 action button:**
- 📥 **Download Importable Clients (Excel)** — sample template (POP-এর zones, packages, profiles সহ pre-filled lookup sheet)
- 🧹 **Clear All Clients** — staging table empty
- 📤 **Upload Importable Clients (Excel)** — file picker → parse + validate
- 📥 **Download Edited Data** — current staging data Excel-এ export

**Filter:** "Only Invalid Customers" dropdown (All / Invalid only / Valid only)

**Table columns** (image-204 হুবহু):
Name | Mobile | Email | NationalID | Address | Zone | Conn.Type | Server | Prot.Type | Profile | UserName | Password | C.Type | Package | Validity.Date | B.Status | M.Bill | Bill.Month | Join.Date | Exp.Date | **Action** (Edit ✏️ / Delete 🗑️)

Invalid row → red highlight + tooltip showing reason (invalid zone name, missing package, duplicate username ইত্যাদি)

**Bottom:** "✅ Transfer to Client List" big button — শুধু valid rows insert করে `clients` table-এ (POP-এর `branch_id` দিয়ে scoped), success-এ row count toast + redirect।

**Staging:** in-memory state (no DB) for the 24-hour window simplicity; data lost on page reload. (Simple, matches reference behavior.)

**Excel parsing:** `xlsx` (SheetJS) library ব্যবহার — already used in project (`exportClientsExcel`)। Sample template-এ ২টা sheet:
- `Clients` — main data
- `Lookup` — POP-এর zones / packages / profiles list (reference হিসেবে)

**Validation rules:**
- Name & Mobile required
- Username unique (existing clients-এর সাথে check)
- Zone name → POP-এর zones-এ exist করতে হবে
- Package code → POP-এর tariff_packages-এ exist করতে হবে
- Mobile format check (BD)
- Join.Date / Exp.Date valid dates

### ফাইল পরিবর্তন

**Migration (database):**
- নতুন `designations` table + RLS
- `seed_pop_defaults(branch_id)` SQL function
- `branches` after-insert trigger → seed call
- One-time backfill: existing branches loop

**নতুন (3 files):**
- `src/pages/reseller/PopMyAreas.tsx` — assigned districts/upazilas list
- `src/pages/reseller/clients/PopBulkClientImport.tsx` — Excel bulk import
- `src/components/reseller/AssignedAreasWidget.tsx` — dashboard card

**Edit:**
- `src/components/ResellerLayout.tsx` — sidebar-এ "My Areas" + "Bulk Client Import" link
- `src/App.tsx` — দুই নতুন route register
- `src/pages/reseller/employee/PopAddEmployee.tsx` — Department/Designation text → Select w/ inline create
- `src/pages/reseller/employee/PopEditEmployee.tsx` — same
- `src/pages/reseller/config/PopDesignations.tsx` — full CRUD page (already exists as placeholder)
- `src/pages/reseller/ResellerDashboard.tsx` — Assigned Areas widget যোগ

### কী বদলাবে না
- Admin dashboard-এর কোনো page
- `pop_district_assignments` schema/logic (read-only জন্য ব্যবহার)
- Existing MikroTik bulk create page (নতুন Excel import এর সাথে coexist করবে)
- Notes / tickets / employees-এর salary module

### Apply-এর পরে expected ফলাফল
1. ✅ POP sidebar-এ "My Areas" — assigned districts/upazilas দেখা যাবে; dashboard-এও widget
2. ✅ নতুন POP create হলে Department (Admin/Technician), Designation (Manager/Technician), Zone (Default Zone) auto-seed হবে; existing POPs-দের জন্য one-time backfill
3. ✅ POP চাইলে এগুলো যেকোনো সময় delete/edit করতে পারবে
4. ✅ Add/Edit Employee-এ Department & Designation dropdown (inline "+ Create" সহ)
5. ✅ "Bulk Client Import" page Excel template download + upload + validate + edit + transfer — image-204 হুবহু
6. ✅ Invalid rows highlighted, valid rows-ই client list-এ যাবে, branch isolation বজায়

