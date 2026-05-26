
# BTRC Report — Bugfix

## সমস্যা
`column isp_packages_1.olt_range does not exist` — কারণ `clients.package_id` দুটি table-এ relationship suggest করে (`packages` এবং `isp_packages`); Supabase auto-pick করে ভুল table (`isp_packages`), যেখানে `olt_range` নেই।

## ফিক্স (একটি ফাইল: `src/pages/dashboard/reports/Btrc.tsx`)

1. **Embed disambiguate** — `pkg:package_id(name, olt_range)` এর বদলে explicit table hint:
   ```
   pkg:packages!clients_package_id_fkey(name, olt_range)
   ```
   FK constraint না থাকলে fallback হিসেবে `packages` table-এ আলাদা query করে `id → name/olt_range` map বানাব এবং client-side join করব। (নিরাপদ পথ — তাই এটাই নেব।)

2. **bandwidth_allocation fallback** — `packages.olt_range` খালি হলে `packages.name` দেখাব।

3. **Column headings** — ইতিমধ্যেই lowercase underscore আছে; শুধু নিশ্চিত করব শেষ column `selling_price_bdt_excluding_vat` (টাইপো নেই)।

4. **Empty email/mobile** — খালি থাকলে `""` (blank) যাবে — কোন `-` দেখাব না।

কোনো DB migration লাগবে না, শুধু query পরিবর্তন।
