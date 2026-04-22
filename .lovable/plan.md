

## পরিস্থিতি Verify করার ফলাফল

**ডেটা বাস্তবতা (DB থেকে confirmed):**
- POP `Nahid` (id `de4cd202…`) এর `branch_id = 26973cfc…` ✅
- MikroTik device `AFTABNAGAR` (id `d459e69b…`) → `branch_id = NULL` ⚠️
- ওই MT-এ মোট **13 জন** mikrotik_clients আছে
- শুধু **3 জন** এর `transferred_to_pop_id = Nahid`-এ set আছে (`abc`, `ppp1`, `e`)
- বাকি 10 জনের কোনো POP assignment নেই

**ফলে এখন কী দেখাচ্ছে:**
- Users page-এ **3 জন** users আসছে (transferred 3 জন) — আপনার সমস্যা ছিল 0 দেখাচ্ছিল, সেটা আগের build cache-এর কারণে ছিল; current code 3 জন দেখাবে
- কিন্তু আপনার expectation ছিল **পুরো MT-এর সব users** (13 জন বা MikroTik dashboard-এ "Running 3/4" যা দেখাচ্ছে) দেখার

**আসল কারণ:** আগের plan-এর "branch-scoped MT হলে সব users দেখাও" branch তখনই কাজ করে যখন `mikrotik_devices.branch_id == pop.branch_id`। কিন্তু এই device-এ `branch_id = NULL`, তাই branch-scoping fail করে fallback হয়ে শুধু 3 transferred user দেখায়।

এছাড়া আরও 2টি bug দেখা গেছে:
1. **Bulk Create page-এ 400 error** — `isp_packages.speed` column query করছে কিন্তু DB-তে `speed` column **নেই** (আছে `bandwidth_down`)
2. **MT device কখনো POP-কে assign-ই হয়নি** — admin manually assignment করেননি

---

## প্রস্তাবিত সমাধান (3 ভাগ)

### ১. MikroTik device-এ POP/Branch assignment শক্ত করা
যেহেতু "MT এই POP-এর" — admin-কে MT device-এ branch assign করতে হবে, অথবা POP-এর reseller_id assign করতে হবে। Code-এ এমন একটি secondary scoping যোগ করা হবে যা **mikrotik_devices.assigned_to_pop_id** (নতুন কলাম) match করলেও সেই MT-এর সব users POP-কে দেখাবে।

```sql
-- Migration
ALTER TABLE mikrotik_devices 
  ADD COLUMN assigned_to_pop_id uuid REFERENCES branch_managers(id);

-- Backfill: যদি admin কোনো MT-তে অলরেডি transfer করে থাকে কোনো POP-এ,
-- সেই MT-কে ওই POP-এর assigned হিসেবে set করো
UPDATE mikrotik_devices md
SET assigned_to_pop_id = sub.pop
FROM (
  SELECT mikrotik_id AS mt, transferred_to_pop_id AS pop, COUNT(*) c
  FROM mikrotik_clients
  WHERE transferred_to_pop_id IS NOT NULL
  GROUP BY mikrotik_id, transferred_to_pop_id
) sub
WHERE md.id = sub.mt AND md.assigned_to_pop_id IS NULL;
```

### ২. ResellerMikrotikUsers + BulkCreate query update
`isBranchScoped` ছাড়াও **`isPopAssigned`** check যোগ করা:

```typescript
const isPopAssigned = mtRow?.assigned_to_pop_id === popId;
const isBranchScoped = !!pop?.branch_id && mtRow?.branch_id === pop.branch_id;

if (isBranchScoped || isPopAssigned) {
  // ওই MT-এর সব users দেখাও
  q = q.eq("mikrotik_id", activeMt);
} else {
  // শুধু transferred users
  q = q.eq("transferred_to_pop_id", popId).eq("transferred_to_mikrotik_id", activeMt);
}
```

`reseller_mikrotiks` query-তেও MT তালিকায় `assigned_to_pop_id = popId` MT গুলো include করা হবে।

### ৩. Bulk Create-এর 400 error fix
`reseller_tariff_packages` query থেকে invalid `speed` column বাদ:
```typescript
.select("id, package_id, selling_rate, isp_packages(id, name, bandwidth_down)")
```
একই fix `ResellerMikrotikUsers.tsx`-এও (line 108)।

### ৪. Admin UI-তে "POP assign" করার option
Admin → MikroTik Devices তালিকায় প্রতিটি device-এর পাশে "Assign to POP" dropdown — যাতে admin চাইলে পুরো device কোনো POP-কে handover করতে পারে।

### ৫. Test/Verification scenario
Migration apply-এর পর:
- AFTABNAGAR device → assigned_to_pop_id auto-backfill হবে `Nahid`-এ (কারণ ইতিমধ্যে 3 user transferred)
- POP login → Mikrotik Users page → AFTABNAGAR tab-এ **13 জন** user দেখাবে (running + disabled সব)
- Bulk Import-এ unlinked সব 13 user dropdown-এ আসবে, package list error ছাড়া load হবে
- Status badges: linked → "Client", transferred → "Transferred", বাকি → "Available"

---

## পরিবর্তন হবে যেসব file

| File | পরিবর্তন |
|------|---------|
| `supabase/migrations/<new>.sql` | `mikrotik_devices.assigned_to_pop_id` কলাম + backfill |
| `src/pages/reseller/ResellerMikrotikUsers.tsx` | `isPopAssigned` check + `isp_packages.speed` → `bandwidth_down` |
| `src/pages/reseller/ResellerMikrotikBulkCreate.tsx` | একই scoping + same column fix |
| `src/pages/dashboard/mikrotik/Devices.tsx` (অথবা equivalent) | "Assign to POP" dropdown |
| `src/integrations/supabase/types.ts` | auto-regen |

## পরিবর্তন হবে না
- RLS / permissions
- POP sidebar (পূর্ববর্তী merge অক্ষত)
- Admin client list isolation logic

## Apply-এর পরে expected ফলাফল
1. ✅ POP `Nahid` AFTABNAGAR-এ ১৩ জন user দেখাবে (বর্তমান 3-এর জায়গায়)
2. ✅ Bulk Import dropdown 400 error ছাড়া load হবে; সব unlinked users select করা যাবে
3. ✅ Admin চাইলে device-এ POP assign/unassign করতে পারবে — এক জায়গা থেকে control
4. ✅ "Available" badge দিয়ে POP বুঝবে কোন user এখনো client হয়নি

