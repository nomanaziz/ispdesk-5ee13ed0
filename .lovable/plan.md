

## লক্ষ্য
আপনার screenshot ও বিবরণ অনুযায়ী POP Admin portal সম্পূর্ণ functional করা — তিনটা মূল সমস্যা solve করতে হবে:

1. **Foundation broken**: `reseller01`-এর `branch_id = NULL` → প্রতিটা POP-scoped page-এ "branch assign করা নেই" banner আসছে
2. **Data scoping schema gap**: অনেক table-এ (`boxes`, `sub_zones`, `departments`, `positions`, `employees`, `isp_packages`) `branch_id` column নেই → POP-scoped CRUD চলবে না
3. **Wrong column names**: `PopPackages` `package_rate`/`profile_speed` query করছে — actual column হলো `selling_rate`/`buy_rate`/`mikrotik_profile`

## Batch 2A — Foundation fix (এই sprint)

### A. Database migration

**A1. Auto-create branch on POP create + backfill existing**
- `branch_managers`-এ row create হলে auto একটা `branches` row বানাবে এবং `branch_id` set করবে (trigger)
- Existing reseller01, noman-এর জন্য branch backfill

**A2. Add `branch_id` to scoped tables**
```sql
alter table boxes        add column branch_id uuid references branches(id);
alter table sub_zones    add column branch_id uuid references branches(id);
alter table departments  add column branch_id uuid references branches(id);
alter table positions    add column branch_id uuid references branches(id);
alter table employees    add column branch_id uuid references branches(id);
-- isp_packages থাকবে global; POP-specific rate `reseller_tariff_packages`-এই থাকবে
create index idx_boxes_branch on boxes(branch_id);
-- (একইভাবে অন্যগুলোর জন্য)
```
RLS update: portal anon/service-role read/write স্বাভাবিকভাবে চলবে; admin সব দেখবে।

**A3. Client code uniqueness**
```sql
-- Per-POP unique to allow same code in different POPs (reseller-style codes)
create unique index uniq_client_id_per_branch
  on clients(branch_id, client_id) where client_id is not null;
-- যদি global unique চান তাহলে: create unique index uniq_client_id on clients(client_id);
```
*আপনি আগে বলেছিলেন "client code কখনো duplicate হতে পারবে না" — দুটো option আছে। নিচে question-এ choose করতে পারবেন।*

**A4. Auto-generate POP client code**
- `clients` insert-এ `client_id` null হলে: `<pop_code>-<seq>` format-এ generate (eg `0002-000123`)
- POP-scoped sequence per `branch_id` (function-based)

**A5. Admin↔POP allotment table already exists** (`pop_district_assignments`) — শুধু admin UI বানাতে হবে।

### B. Admin-side: District/Upazila Allotment UI

**নতুন page**: `src/pages/dashboard/branches/PopAllotment.tsx`
- POP edit screen থেকে link/tab
- বাঁ দিকে districts checkbox list, ডান দিকে selected district-এর upazilas multi-select
- Save → `pop_district_assignments` upsert
- Existing route `/dashboard/branches/edit-manager/:id`-এ "District Allotment" tab যোগ

### C. PopPackages — sync data from tariff (rate সহ)

**`PopPackages.tsx` rewrite**:
- Query field সঠিক করবো: `selling_rate`, `buy_rate`, `mikrotik_profile`, `protocol_type`, `validity_days`, `min_activation_days`
- Screenshot layout-এর মতো columns: PackageName | ServerName | Protocol | Profile | BuyingRate | SellingRate | ValidityDays | Min R.Days
- Read-only (admin tariff থেকে আসে — POP edit করতে পারবে না)

### D. PopAllotedAreas split → Districts + Upazilas

বর্তমানে এক page এ দুটোই — split করব:
- `/pop-admin/config/districts` — শুধু allotted districts list (read-only, admin-set)
- `/pop-admin/config/upazilas` — district filter সহ allotted upazilas

Both query `pop_district_assignments` joined with `districts`/`upazilas` tables.

### E. PopScopedCrud-এ NULL branch handling
যেহেতু trigger এখন auto branch বানাবে, "no branch" banner কম দেখাবে। তবু safety রাখব।

## Batch 2A files (এই message-এ)

**Migration (১):**
- `supabase/migrations/<ts>_pop_admin_foundation.sql` — A1–A4 সব

**Edited (৪):**
- `supabase/functions/portal-auth/index.ts` — extended permissions object issue
- `src/pages/reseller/config/PopPackages.tsx` — সঠিক columns
- `src/pages/reseller/config/PopAllotedAreas.tsx` → split into PopDistricts + PopUpazilas
- `src/App.tsx` — split routes wire
- `src/pages/dashboard/branches/EditManager.tsx` — "District Allotment" tab

**New (২):**
- `src/pages/dashboard/branches/PopAllotment.tsx` — admin allotment UI component
- `src/pages/reseller/config/PopUpazilas.tsx` — split-out page

## Batch 2B — Module wiring (পরের sprint, এই plan-এ list করা)

**Client module (full admin parity):**
- `PopAddClient` rewrite — pull from admin `AddClient.tsx` template, scope-filtered dropdowns (zones/boxes/packages from POP), auto client_id generation, NID/address fields
- `PopNewRequest` — new connection requests for this POP
- `PopChangeRequest` — package change requests
- `PopClientList` — full table with all admin columns (status, expire, mikrotik, package, monthly_bill)
- `PopBillingClient` — billing eligibility filtering
- `PopLeftClients` / `PopScheduler` — already wired, verify branch filter

**Employee module:** AddEmployee এ photo upload, departments/positions dropdown POP-scoped

**Billing module:** BillingList, Invoice, DailyCollection, ClientBillProfile — all branch-scoped wrapper

**Monitoring:** OnlineClients, PingTools — POP-scoped

**SMS service:** Templates/Individual/Group/Send/Gateway — POP own credit balance থেকে deduct

**Reports (6):** BillCollection, Enable/Disable, Messages, ProcessingFee, Discount, DueSms

**System → Period:** writes to `pop_billing_periods`

**Fund History:** Credit & Debit — `branch_funding` filtered by branch_id

## যা **হবে না**
- Global `isp_packages` table-এ POP-specific rate column add করব না — POP-rate already `reseller_tariff_packages`-এ আছে
- পুরাতন reseller URL ভাঙবে না (legacy redirect আছেই)
- Admin module untouched

## প্রশ্ন যা decide করতে হবে

**Client code uniqueness**: "duplicate হতে পারবে না" — কোন scope-এ?
- (a) **Per-POP unique** — দুটো ভিন্ন POP একই code ব্যবহার করতে পারবে (recommend, screenshot-এর GalaxyNet style এটাই)
- (b) **Global unique** — পুরো system-এ একবারই

আপনি Batch 2A approve করলে migration + foundation fix apply করি। তারপর Batch 2B (client/billing/sms/reports full pages) ধাপে ধাপে যাবো।

