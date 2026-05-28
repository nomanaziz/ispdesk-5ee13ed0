## সমস্যার মূল কারণ

`src/lib/menuItemModuleMap.ts` (ITEM_MODULE) এ অনেক sidebar URL **missing**, আর HR এর প্রায় সব সাব-আইটেম ভুল করে একই `HR_PAYROLL / Employees` মডিউলে map করা — ফলে:

1. **INVENTORY → Categories permission দিলেও মেনু আসে না** — কারণ `/dashboard/inventory/categories` ITEM_MODULE-এ নেই, fallback হিসেবে group `ইনভেন্টরি` চেক হয়, কিন্তু `GROUP_MODULE`-এ "ইনভেন্টরি" নেই → পুরো group hidden।
2. **শুধু "Employees" permission দিলে পুরো HR group খুলে যায়** — কারণ Payroll / Payslip / Salary Sheet / Advance Salary / Loans / Resignations / Conveyance / Catering / HR Settings — সবগুলো ITEM_MODULE-এ `Employees` লেখা; এছাড়া unmapped item-গুলোর fallback `groupHasAccess = Employees` true হয়ে যায়।
3. একই সমস্যা **BW Sale, BW Buy, OLT, Network, Device Admin, Tasks, Reports, Shop, Purchases, Sales, Assets, Events, Website, Config, VAS, Branches (POP/MAC)** — কোনো item-mapping নেই, তাই হয় সব খুলে যায় (যদি group fallback true) বা সব hidden।

DB-তে সব দরকারি `app_role_modules` entry আগে থেকেই আছে (INVENTORY/Categories, HR_PAYROLL/Payroll, BW_SALE/*, BRANCHES/*, OLT/*, NETWORK/*, SHOP/*, ইত্যাদি), শুধু frontend mapping অসম্পূর্ণ।

## ফিক্সের পরিকল্পনা

### ১) `src/lib/menuItemModuleMap.ts` — পূর্ণাঙ্গ ITEM_MODULE (সব sidebar URL)

প্রতিটি `menuGroups` item-কে সঠিক `(module_group, module_name)` দিয়ে map করব। উদাহরণ:

- HR বিভাগ আলাদা করব:
  - `/dashboard/hr/employee-hub` → HR_PAYROLL / Employee Hub
  - `/dashboard/hr/payroll` → HR_PAYROLL / Payroll
  - `/dashboard/hr/payslip` → HR_PAYROLL / Payslip
  - `/dashboard/hr/employees` → HR_PAYROLL / Employees  *(শুধু contact দেখার জন্য)*
  - `/dashboard/hr/salary-sheet` → HR_PAYROLL / Salary Sheet
  - `/dashboard/hr/advance-salary` → HR_PAYROLL / Advance Salary
  - `/dashboard/hr/loans` → HR_PAYROLL / Employee Loans
  - `/dashboard/hr/resignations` → HR_PAYROLL / Resignations
  - `/dashboard/hr/attendance` → HR_PAYROLL / Attendance
  - `/dashboard/hr/conveyance-bills` + `/dashboard/hr/my-conveyance` → HR_PAYROLL / Conveyance Bills
  - `/dashboard/hr/catering` → HR_PAYROLL / Catering
  - `/dashboard/hr/settings` → HR_PAYROLL / HR Settings
  - `/dashboard/hr/leave` → HR_PAYROLL / Leave Management
- Inventory: units/locations/categories/items/stock → INVENTORY / {Items, Locations, Categories, Stock} (units → Items)
- BW Sale, BW Buy, Branches (POP/MAC), OLT, Network, Monitoring, Device Admin, Mikrotik, Tasks, Reports, SMS, Shop, Purchases, Sales, Assets, Events, Website, Config, VAS, Accounting, Support, System — সব route entry যোগ করব এক্সিস্টিং DB মডিউল নাম মিলিয়ে।

### ২) `src/components/AppSidebar.tsx` — strict fallback

`orderedGroups` filter-এ unmapped item-এর জন্য `groupHasAccess` fallback **বাদ** দেব। মানে:

- ITEM_MODULE-এ entry না থাকলে non-admin user-এর জন্য item hidden।
- Super Admin / Admin সব আগের মতই দেখবে।

এতে permission "leak" বন্ধ হবে, এবং সব item সঠিক permission দিয়েই নিয়ন্ত্রিত।

### ৩) `src/lib/menuModuleMap.ts` — group fallback ছেঁটে সঠিক করা

`HR ও পেরোল` → `Employees` mapping leak-এর কারণ। GROUP_MODULE শুধু "group label collapse-এ থাকলে আইকন show করার জন্য" ব্যবহার হয় না — orderedGroups-এ ব্যবহৃত। strict-fallback হলে আর দরকার নেই; তবু সংক্ষেপে রেখে সব item-level হবে।

### ৪) Action gating audit (delete/edit permissions)

আগের কাজে `ClientActionButtons.tsx` ঠিক হয়েছে। এখন **এক রাউন্ড QA** করব:

- `useModulePermission(group, name)` ব্যবহার করে relevant page-এর Add/Edit/Delete buttons-এ Guard আছে কিনা — Inventory, Shop, BW Sale, Assets, Branches, HR sub-pages।
- যেখানে শুধু `<Guarded module=...>` page-level আছে কিন্তু button-level guard নেই, সেখানে minimum দুই জায়গায় (Add button + row Delete) `canWriteItem` / `canDeleteItem` যোগ করব।

### ৫) Roles & Permissions UI (`/dashboard/access/roles`)

`access/RoleFeaturePanels.tsx` UI ইতিমধ্যেই DB-driven (`app_role_modules`), তাই নতুন entry নিজে নিজেই দেখা যাবে। শুধু verify করব Employee role default-এ কোনগুলো on/off আছে — যা missing সেগুলো previous migration-এ যোগ করা আছে।

### ৬) Verification

* DB query: প্রতিটি ITEM_MODULE entry আসলেই `app_role_modules`-এ আছে কিনা।
* Manual: Employee role-এ শুধু `HR_PAYROLL/Employees` (read) এবং `INVENTORY/Categories` (write) দিয়ে test —
  - HR group-এ শুধু "কর্মচারী তালিকা" item দেখা যাবে; বাকি সব hidden।
  - Inventory group-এ শুধু "আইটেম ক্যাটাগরি" দেখা যাবে; Add button visible, Delete hidden।
* Debug page `/dashboard/debug/panel-visibility` দিয়ে role/permission resolution verify।

## প্রভাবিত ফাইল

- **`src/lib/menuItemModuleMap.ts`** — পূর্ণাঙ্গ rewrite (সব sidebar URL → DB module)
- **`src/lib/menuModuleMap.ts`** — সংক্ষিপ্ত (group-level fallback বাদ)
- **`src/components/AppSidebar.tsx`** — `orderedGroups`-এ strict filter (unmapped item hidden for non-admin)
- **`src/pages/dashboard/inventory/*`**, **`shop/*`**, **`bw-sale/*`**, **`assets/*`**, **`branches/*`** — Add/Edit/Delete buttons-এ permission guard যোগ (audit-based, যেখানে missing)

কোনো DB migration লাগবে না — সব module entry আগে থেকেই আছে।
