

## সমস্যা বিশ্লেষণ

আপনি যা বলেছেন তিনটা মূল সমস্যা:

1. **Tariff/Package mismatch**: POP-এ tariff assign করা না থাকলে package পেজে কিছু আসে না। আবার `PopAddClient`-এ admin-এর global `isp_packages` সরাসরি query হচ্ছে — POP-এর tariff-এ assigned package-গুলো আসা উচিত।
2. **District/Upazila not visible**: POP profile-এ district/upazila set করা থাকলেও `PopAllotedAreas` শুধু `pop_district_assignments` query করে — যদি admin allotment না করে, তাহলে নিজের default district/upazila-ও show হয় না।
3. **PopAddClient simplistic**: শুধু ৯টা field — admin-এর `AddClient.tsx`-এ ৪০+ field (NID, পিতা-মাতা, MikroTik profile, expire_day, joining_date, prorated billing, etc.)। **POP admin-এর experience admin panel-এর সমান হতে হবে**।

## সমাধানের কৌশল: Admin module-গুলো POP scope-এ reuse

প্রতিটা page নতুন করে না বানিয়ে, admin-এর existing component-গুলোকে **POP context-aware** করা হবে — branchId দিলে সেই branch-এ scope হবে, না দিলে admin এর মত সব দেখাবে।

## Batch 2C: Foundation parity

### ১. `AddClient.tsx` কে POP-aware করা (single source of truth)
**File**: `src/pages/dashboard/clients/AddClient.tsx` modify + `src/pages/reseller/clients/PopAddClient.tsx` rewrite

- AddClient-এ একটা `popMode` prop যোগ — `usePortalAuth` থেকে detect, অথবা wrapper দিয়ে pass
- POP mode হলে:
  - `branch_id` auto inject (form এ hidden)
  - **Zone, sub_zone, box** query → `.eq("branch_id", branchId)` filter
  - **Package list** query → `isp_packages` directly noi, বরং `reseller_tariff_packages` join through POP-এর tariff:
    ```
    reseller_tariff_packages → isp_packages 
    where tariff_id = (SELECT tariff_id FROM branch_managers WHERE branch_id = popBranch)
    ```
    Selling rate use হবে monthly_bill হিসেবে (admin-এর global price না)
  - **District/Upazila auto-fill** disabled inputs দুটোতে POP-এর default district/upazila বসবে (allotment থাকলে dropdown, না থাকলে default)
  - **Sidebar redirect**: `/pop-admin/clients` 
- `PopAddClient.tsx` কে wrapper বানাব — শুধু `<AddClient popMode />` render
- Admin mode untouched — backward compatible

### ২. Package sync fix — Admin tariff allotment auto-show
**Files**:
- `PopPackages.tsx` — already fixed; verify query শুধু POP-এর tariff-এর package দেখায়
- `PopAddClient` package dropdown → একই tariff package source থেকে load

**Bonus**: যদি POP-এ tariff assign না থাকে → clear banner: *"Admin আপনার POP-কে এখনো tariff assign করেনি। নতুন client তৈরির জন্য admin-এর সাথে যোগাযোগ করুন।"*

### ৩. PopAllotedAreas (District/Upazila) — Default fallback
**File**: `src/pages/reseller/config/PopAllotedAreas.tsx`

Logic update:
- `pop_district_assignments` query করার পরে যদি empty হয়:
  - POP profile থেকে `district_id` + `upazila_id` fetch করব
  - এগুলোকেই virtual allotment হিসেবে show করব with badge **"Default — POP profile থেকে"**
- ফলে কখনোই empty page দেখাবে না (যদি POP-এ district set থাকে)

### ৪. Module reuse plan — Phase tactic
সব 40+ admin page POP-scope করতে হবে। এই batch-এ foundation:

**Pattern**: প্রতিটা admin page-এ একটা optional `popMode` detect (via `usePortalAuth().customer.branch_id` exists) → সব Supabase query auto-filter `.eq("branch_id", branchId)`। Top heading admin-এর জন্য full title, POP-এর জন্য "POP - [name]" prefix।

এই batch-এ wire করব **ক্লায়েন্ট module-এর ৫টা page**:
1. `AddClient` → `/pop-admin/clients/add` ✓
2. `ClientList` → `/pop-admin/clients` (admin-এর full table reuse, branch filter)
3. `BillingList` → `/pop-admin/clients/billing`
4. `LeftClients` → `/pop-admin/clients/left`
5. `Scheduler` → `/pop-admin/clients/scheduler`

`App.tsx`-এর routes update — `Pop*` simple wrappers-এর বদলে admin component সরাসরি use।

### ৫. Helper hook
**New file**: `src/hooks/usePopScope.ts`
```
export function usePopScope() {
  const { customer } = usePortalAuth();
  const branchId = customer?.branch_id;
  const isPopMode = !!branchId;
  return { isPopMode, branchId, popName: customer?.name };
}
```
সব admin component-এ এটা import → query গুলো conditional filter করবে।

## File changes এই batch-এ

**Modify (5):**
- `src/pages/dashboard/clients/AddClient.tsx` — POP-aware queries (branch_id filter, tariff package source)
- `src/pages/dashboard/clients/ClientList.tsx` — branch filter when POP mode
- `src/pages/dashboard/billing/BillingList.tsx` — branch filter
- `src/pages/dashboard/clients/LeftClients.tsx` — branch filter
- `src/pages/dashboard/clients/Scheduler.tsx` — branch filter
- `src/pages/reseller/config/PopAllotedAreas.tsx` — default fallback fix
- `src/App.tsx` — wire admin pages to `/pop-admin/clients/*` routes
- `src/contexts/PortalAuthContext.tsx` — verify branch_id exposed properly

**New (1):**
- `src/hooks/usePopScope.ts` — shared scope hook

**Replace (1):**
- `src/pages/reseller/clients/PopAddClient.tsx` — thin wrapper around AddClient

## যা **হবে না**
- DB schema change নেই
- Admin panel functionality untouched
- Public/portal client module untouched
- পরের batch-এ: Employee, SMS, Reports, Monitoring, System modules একই pattern

## Next batches (preview)
- **2D**: Employee module (5 pages) + Department/Designation POP-scoped CRUD
- **2E**: Billing actions (Invoice, Daily Collection, Bill Profile) + SMS module
- **2F**: Reports (6 pages) + Monitoring + System

approve করলে Batch 2C শুরু করি।

