

## Tariff-এ Package Filter + Portal Visibility

### সমস্যা

1. `Tariff.tsx`-এ `.eq("package_type", "pop")` filter আছে — কিন্তু কোনো package-এর type "pop" না (সব "home")। তাই dropdown-এ কিছুই আসে না।
2. Reseller/POP মূলত **home** package sell করে, কিন্তু dedicated/corporate-ও দিতে পারে। Filter সঠিক করতে হবে।
3. Admin কিছু package নিজের client-এর জন্য রাখতে চাইতে পারে — portal-এ client-রা সেগুলো দেখবে না (change request করার সময়)। অর্থাৎ admin per-package portal visibility toggle করতে পারবে।

### সমাধান

#### 1. DB Migration — `isp_packages.portal_visible` (boolean)
- নতুন column: `portal_visible boolean default true`
- Admin disable করলে false → portal-এ hide

#### 2. `Tariff.tsx` — Package Dropdown ঠিক করা
- `.eq("package_type", "pop")` সরিয়ে fetch করব `package_type IN ('home','corporate','business','dedicated')` (sellable types)
- "personal" এবং "pop" type বাদ (internal use)
- Dropdown-এ package_type badge সহ দেখাব: `নাম — ৳দাম (Home)`

#### 3. `Packages.tsx` (Config) — Portal Visibility Toggle
- Form-এ Switch: "ক্লায়েন্ট পোর্টালে দেখান"
- Table-এ একটা column: portal visibility icon (Eye/EyeOff) — click করে toggle
- Default: visible

#### 4. Portal/ChangeRequest — Filter
- Client portal-এ যেখানে package list আসে (change request flow), সেখানে query-তে `.eq("portal_visible", true).eq("status", "active")` যোগ
- Internal admin pages এ filter থাকবে না (সব package দেখা যাবে)

### Files

| File | Change |
|------|--------|
| migration | `isp_packages`-এ `portal_visible boolean default true` যোগ |
| `src/pages/dashboard/branches/Tariff.tsx` | Package query থেকে `pop` filter সরানো, sellable types-এ filter, label-এ type badge |
| `src/pages/dashboard/config/Packages.tsx` | Form-এ portal_visible Switch, table-এ toggle column |
| `src/pages/dashboard/clients/ChangeRequest.tsx` | যদি package selector থাকে — `portal_visible=true` filter যোগ (verify করব) |
| portal change-request page (যদি থাকে) | একই filter |

### Note
- বর্তমান সব package portal-এ visible থাকবে (default true)
- Admin ইচ্ছামতো hide করতে পারবেন Config → Packages থেকে

