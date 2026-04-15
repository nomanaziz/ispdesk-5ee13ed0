

## Plan: Packages & Tariff Restructure — "রিসেলার" → "POP"

### Overview
1. Add "pop" to package types so POP packages are managed from the main Packages page
2. Remove the separate BranchPackages page (it's redundant)
3. Rename "রিসেলার" → "POP" across the sidebar and related pages
4. Add `min_activation_days` column to `reseller_tariffs` table
5. Restructure the Tariff form: Server → Protocol → Profile (from MikroTik), plus min activation days field

### Database Migration
- Add `min_activation_days integer default 1` to `reseller_tariffs`

### File Changes

**1. `src/pages/dashboard/config/Packages.tsx`**
- Add `{ value: "pop", label: "POP", color: "bg-indigo-500" }` to PACKAGE_TYPES array
- Everything else stays the same — POP packages are now managed here

**2. `src/components/AppSidebar.tsx`**
- Rename sidebar group "MAC Reseller" → "POP Management"
- Remove the "প্যাকেজ" menu item (url: `/dashboard/branches/packages`)
- Rename "রিসেলার ফান্ডিং" → "POP ফান্ডিং"

**3. `src/App.tsx`**
- Remove the BranchPackages import and route (`/dashboard/branches/packages`)

**4. `src/pages/dashboard/branches/Tariff.tsx`**
- Add `min_activation_days` to form (default 1)
- Filter packages to only show `package_type = 'pop'` in the select
- Reorder form fields: Package → Selling Rate → Activation Days → Min Activation Days → Server → Protocol Type → MikroTik Profile
- Replace "রিসেলারদের জন্য" → "POP-এর জন্য" in subtitle
- Replace the `is_daily_recharge` toggle with the `min_activation_days` numeric input

**5. Other files with "রিসেলার" text** (AddManager, Funding, PgwPayments, PopNotice, Managers)
- Replace "রিসেলার" with "POP" in UI labels throughout

**6. Delete `src/pages/dashboard/branches/BranchPackages.tsx`**

### Technical Details
- 1 migration: add column `min_activation_days` to `reseller_tariffs`
- ~7 files edited, 1 file deleted
- Tariff's package select will filter by `package_type = 'pop'`
- `min_activation_days` must be ≤ `activation_days` (validated in UI)

