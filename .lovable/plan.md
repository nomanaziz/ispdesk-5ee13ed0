

## লক্ষ্য
Pricing terminology system-wide consistent করা — Admin-এর কোনো "buying rate" থাকবে না, শুধু **Selling Rate**। সেই Admin Selling Rate = POP Admin-এর **Buying Rate** (locked)। POP Admin তার নিজের **Selling Rate** set করবে।

## বর্তমান অবস্থা (audit)

### Database (`reseller_tariff_packages`)
- `selling_rate` column → **Admin-এর selling price** (সঠিক)
- `buy_rate` column → পুরোনো legacy field, এখন এটা confusing

### Admin UI (`src/pages/dashboard/branches/Tariff.tsx`)
- বর্তমানে hopefully দুটো price input দেখাচ্ছে ("Buy Rate" + "Selling Rate") — এটা **ভুল**
- হওয়া উচিত: শুধু **একটা** "Selling Rate" input

### POP Admin UI (`src/pages/reseller/config/PopPackages.tsx`)
- `BuyingRate` দেখাচ্ছে DB-এর `buy_rate` থেকে → **ভুল mapping**
- হওয়া উচিত: `BuyingRate` = Admin-এর `selling_rate` (locked)
- `SellingRate` (editable) = POP-এর নিজের price → এর জন্য আলাদা storage দরকার

### Edge function (`portal-data` → `get_tariff_packages`)
- বর্তমানে `normalizePackageRates` swap logic আছে — এটা **hack**, এখন remove করা যাবে

## Root cause
Schema-এ POP-specific selling price store করার আলাদা জায়গা নেই। `selling_rate` ও `buy_rate` দুটোই Admin level field। POP নিজের markup save করার জায়গা নেই।

## সমাধান (3-part)

### 1. Database migration — POP-specific selling price storage
নতুন table:
```sql
CREATE TABLE public.pop_package_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_manager_id uuid NOT NULL REFERENCES branch_managers(id) ON DELETE CASCADE,
  tariff_package_id uuid NOT NULL REFERENCES reseller_tariff_packages(id) ON DELETE CASCADE,
  pop_selling_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (branch_manager_id, tariff_package_id)
);
```
- RLS: POP shop ও admin শুধু নিজের row access করতে পারবে
- Default = Admin selling_rate (auto-seed via trigger when new tariff package created and tariff is assigned to POPs)

`reseller_tariff_packages.buy_rate` column → keep but mark deprecated (data intact, future cleanup)।

### 2. Admin Tariff UI fix (`src/pages/dashboard/branches/Tariff.tsx`)
- "Buy Rate" input field সম্পূর্ণ remove
- শুধু একটা "Selling Rate" input রাখা (label: "Selling Rate (POP Buying Rate)")
- Save করার সময় `selling_rate`-এ value যাবে; `buy_rate`-এ same value mirror করব backward compatibility-র জন্য

### 3. POP Package UI + edge function fix
**`portal-data` → `get_tariff_packages`**:
- `normalizePackageRates` swap hack remove
- Each package row-এর সাথে join করে `pop_package_pricing.pop_selling_rate` আনব (POP-এর নিজের price)
- যদি pricing row না থাকে → auto-create with default = `selling_rate`
- Response shape:
  ```
  { id, package_name, server_name, protocol_type, profile,
    admin_selling_rate (= POP buying rate, locked),
    pop_selling_rate (editable),
    validity_days, min_activation_days }
  ```

**`portal-data` → `update_tariff_selling_rate`**:
- এখন `pop_package_pricing.pop_selling_rate` update করবে (Admin's selling_rate touch হবে না)
- Validation: `pop_selling_rate >= admin_selling_rate`

**`src/pages/reseller/config/PopPackages.tsx`**:
- Column order ও terminology already ঠিক আছে, শুধু data source update:
  - `BuyingRate` cell = `admin_selling_rate` (locked, lock icon)
  - `SellingRate` cell = `pop_selling_rate` (editable)
- Validation message: "Selling rate buying rate (৳X) এর কম হতে পারবে না"

### 4. AddClient flow check
`PopAddClient` → `AddClient.tsx` যেখানে package select করলে rate auto-fill হয়, সেখানে `pop_selling_rate` আসবে (Admin price না)। যদি current code `selling_rate` থেকে আনে → সেটা update করে POP-specific price থেকে আনতে হবে।

## যাচাই (apply-এর পরে)
1. Admin → Tariff Edit page → শুধু "Selling Rate" input দেখাবে, কোনো "Buy Rate" নেই
2. POP → Package page → BuyingRate = Admin price (locked, e.g., 230), SellingRate = POP price (editable, e.g., 500)
3. POP edit করে SellingRate change করলে শুধু POP-এর price বদলাবে; Admin price intact
4. POP AddClient → package select → rate auto-fill হবে POP's own selling_rate দিয়ে
5. অন্য POP-এর পরিবর্তন এক POP affect করবে না

## যা **বদলাবে না**
- Existing tariff package rows intact
- `reseller_tariffs` table intact
- Other modules (billing, invoices) intact
- Trigger logic (`log_tariff_package_change`) intact

## Files
- **Migration**: new `pop_package_pricing` table + RLS + auto-seed trigger
- **Modified**: `src/pages/dashboard/branches/Tariff.tsx` (remove buy_rate input)
- **Modified**: `supabase/functions/portal-data/index.ts` (`get_tariff_packages`, `update_tariff_selling_rate` actions)
- **Modified**: `src/pages/reseller/config/PopPackages.tsx` (use new field names)
- **Inspect & possibly modify**: `src/pages/dashboard/clients/AddClient.tsx` (POP context-এ pop_selling_rate ব্যবহার)

approve করলে default mode-এ migration + code changes apply করব।

