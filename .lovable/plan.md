

## লক্ষ্য

প্রতিটা package-এ **VAT % set** করার system + website-এ **including/excluding price display** + customer-এর জন্য **VAT calculator toggle**।

## DB Migration

`isp_packages` table-এ ৩টা column যোগ:
- `vat_percent` numeric default `0` — VAT rate (e.g. 5, 10, 15)
- `price_includes_vat` boolean default `true` — price-এ VAT অন্তর্ভুক্ত কিনা
- `show_vat_breakdown` boolean default `false` — website-এ VAT breakdown দেখাবে কিনা

এছাড়া একটা global `system_settings` key `vat_default` (default percent + default mode) — নতুন package-এ auto-fill হবে।

## পরিবর্তন

### 1. Admin → `Packages.tsx`
Add/Edit dialog-এ একটা "VAT" section:
- **VAT % input** (default global setting থেকে)
- **Radio:** "Price includes VAT (পাঁচশো ৫% সহ)" / "Price excludes VAT (পাঁচশো + ২৫ টাকা VAT)"
- **Switch:** "Website-এ VAT breakdown দেখাও" (optional helper toggle)
- Table-এ ছোট badge: `VAT 5% Incl.` / `+5% VAT` etc.

### 2. Global Setting → `system/Setup.tsx` (or new `VatSettings`)
- Default VAT % (e.g. 5)
- Default mode: Including / Excluding
- নতুন package add করলে auto-prefill

### 3. Public website → `Packages.tsx` + `Home.tsx` package cards
Display logic:
- **`vat_percent === 0`**: শুধু `৳500/মাস` (কিছু extra না)
- **`price_includes_vat === true`**:
  - Main: `৳500/মাস` 
  - Small line: `(৫% VAT সহ)`
  - Optional breakdown (if `show_vat_breakdown`): `Base ৳476.19 + VAT ৳23.81`
- **`price_includes_vat === false`**:
  - Main: `৳525/মাস` (price + VAT total)
  - Small line: `Base ৳500 + ৫% VAT ৳25`

### 4. VAT Calculator toggle (customer-facing)
Public Packages page-এ একটা toggle button: **"VAT সহ দেখুন / VAT ছাড়া দেখুন"**
- যাদের package-এ `vat_percent = 0` (currently no VAT) সেগুলোর জন্য — toggle ON করলে user ইনপুট দিতে পারবে "Apply VAT %" (5/10/15) → সব price live recalculate হবে → পরিষ্কার বুঝবে কত বাড়ে
- Helper utility: `src/lib/vat.ts` — `calcVat(price, percent, mode)` returning `{ base, vat, total }`

### 5. Billing impact (notice only, no auto-change)
Plan-এ এই step **ঐচ্ছিক** — আপাতত just display। যদি চান billing generation-এ VAT auto-apply করব (separate plan), but এই round-এ scope-এর বাইরে। Plan note রাখব।

## Files

**Migration:** `isp_packages` + 3 columns

**Edit:**
- `src/pages/dashboard/config/Packages.tsx` — VAT fields in form + table badge
- `src/pages/dashboard/system/Setup.tsx` — default VAT settings (or new tab)
- `src/pages/public/Packages.tsx` — including/excluding display + customer VAT toggle
- `src/pages/public/Home.tsx` — package card VAT line
- `src/lib/vat.ts` (নতুন utility)

## ফলাফল

- Admin per-package VAT % set + mode choose করতে পারবে
- Website cards পরিষ্কার দেখাবে: `৳500 (৫% VAT সহ)` বা `৳525 = ৳500 + ৳25 VAT`
- VAT-হীন package-এ customer নিজে toggle দিয়ে hypothetical VAT calculate করে দেখতে পারবে
- Global default থাকায় একই VAT প্রতিবার type করতে হবে না

