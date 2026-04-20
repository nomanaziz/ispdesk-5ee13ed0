

## লক্ষ্য
Tariff system-এ ৪টা উন্নতি:
1. **CreatedBy → employee/user নাম** দেখানো (এখন id/email আসছে)
2. **Action column-এ ৩টা button**: Sync Package, Sync Profile, Change Log
3. **Tariff Change Log** — কে/কখন/কী change করেছে সব track + dialog-এ bold দেখানো
4. **Safe Delete Guard** — কোনো package/profile/server delete করার আগে check করবে যে কোনো client/user-এর সাথে link আছে কিনা; থাকলে block করে message দেখাবে

## কাজের ব্রেকডাউন

### ১. CreatedBy নাম দেখানো
- `reseller_tariffs.created_by` (uuid) → `profiles` table থেকে `full_name` join করে দেখাব
- যদি `full_name` ফাঁকা থাকে → email-এর প্রথম অংশ fallback
- নতুন tariff/package add/edit করলে `created_by = auth.uid()` auto set হবে

### ২. Action Buttons (screenshot অনুযায়ী)
Tariff list table-এর Action column-এ existing edit/delete-এর পাশে যোগ হবে:

| Icon | Button | কাজ |
|---|---|---|
| 🔄 (refresh) | **Sync Package** | এই tariff-এর সব assigned POP-এর সব client-কে নতুন package config-এ re-sync (DB level) |
| ⊙ (cycle) | **Sync Profile** | সব client-কে MikroTik server-এ নতুন profile push (existing `sync-tariff-package-change` edge function ব্যবহার) |
| 📋 (history) | **Change Log** | নতুন dialog খুলবে — পুরা history দেখাবে |

প্রতিটায় confirmation dialog: "X client affected হবে — চালিয়ে যান?"

### ৩. Tariff Change Log (নতুন)

**নতুন table `reseller_tariff_change_logs`**:
- `id`, `tariff_id`, `tariff_package_id` (nullable)
- `tariff_name`, `tariff_type`, `assigned_pops` (text — snapshot)
- `package_name`, `server_name`, `profile`, `profile_speed`
- `package_rate`, `validity_days`, `min_activation_days`
- `effective_from`, `effective_to`
- `changed_fields` (jsonb — কোন কোন field পরিবর্তন হয়েছে; UI-তে এগুলো **bold red** দেখাব)
- `change_reason` (text, optional)
- `changed_by` (uuid → profiles), `changed_at`

**Trigger**: `reseller_tariff_packages`-এ INSERT/UPDATE হলে automatic একটা log row insert হবে। Old vs New compare করে `changed_fields` array তৈরি হবে।

**UI Dialog** (uploaded screenshot অনুযায়ী):
- Header: "{Tariff Name} change logs:"
- Filter: Server dropdown, Package dropdown
- Table cols: S/N, Tariff Name, Tariff Type, Assigned POPs, Packages, Servers, Profiles, ProfileSpeed, PackageRate, ValidityDays, Min.Activation Days, EffectiveFrom, EffectiveTo, Changed By, Changed On
- যেসব column `changed_fields`-এ আছে সেগুলো **bold + red** style-এ render হবে

### ৪. Safe Delete Guards

**যেখানে যেখানে guard লাগবে**:
| Resource | Block যদি... |
|---|---|
| `reseller_tariff_packages` row delete | কোনো client `clients.package_id = এই row.package_id` AND ওই client-এর POP তে এই tariff assigned |
| `isp_packages` (Packages config) delete | কোনো client/tariff-এ ব্যবহৃত হলে |
| `mikrotik_devices` delete | কোনো client/tariff-package-এ ব্যবহৃত হলে |
| MikroTik profile (config) delete | কোনো tariff-package-এ ব্যবহৃত হলে |

**Approach**: Client-side pre-check query → পেলে toast error দেখাব "এটি delete করা যাবে না — X জন client এই package ব্যবহার করছে: [client list preview]। আগে তাদের অন্য package-এ shift করুন।"

**Pages where added**:
- `Tariff.tsx` — package row delete-এর আগে check
- `dashboard/config/Packages.tsx` — package delete-এর আগে check
- `dashboard/mikrotik/Servers.tsx` — server delete-এর আগে check

### ৫. Server change → Auto profile validate
Tariff edit dialog-এ যখন server change হবে:
- নতুন server-এর profiles auto fetch (existing `fetch-mikrotik-profiles` edge function)
- যদি বর্তমান `mikrotik_profile` ওই server-এ exist করে → save allowed; না করলে warning দেখাব এবং user-কে নতুন profile select করতে বলব
- Save-এর পর existing `sync-tariff-package-change` edge function trigger হবে (আগে থেকেই আছে)

## ফাইল পরিবর্তন

### Database Migration
- ➕ `reseller_tariff_change_logs` table + RLS + index on `tariff_id`
- ➕ Trigger function `log_tariff_package_change()` — INSERT/UPDATE on `reseller_tariff_packages`
- ➕ Trigger function `log_tariff_meta_change()` — UPDATE on `reseller_tariffs` (name, type)

### Code
- ✏️ `src/pages/dashboard/branches/Tariff.tsx` — CreatedBy name join, ৩টা new action button, Change Log dialog component, Sync confirmations, delete guard with client check, server-change profile validation
- ➕ `src/components/branches/TariffChangeLogDialog.tsx` — change log viewer (filter + bold-red changed cells)
- ✏️ `src/pages/dashboard/config/Packages.tsx` — delete guard
- ✏️ `src/pages/dashboard/mikrotik/Servers.tsx` — delete guard
- ✏️ `supabase/functions/sync-tariff-package-change/index.ts` — "package only" sync mode যোগ (DB-level update without MikroTik push) for "Sync Package" button

## কী **হবে না**
- পুরাতন data বা migration touch হবে না
- Client portal/reseller portal অপরিবর্তিত
- কোনো existing column rename/drop হবে না

