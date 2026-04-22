
## লক্ষ্য
POP admin MikroTik page-এ “আপনার POP-এ এখনো কোনো MikroTik server assign করা হয়নি” ভুলভাবে দেখানো বন্ধ করা, এবং MikroTik Users + Bulk Import দুটোই POP login থেকে সত্যি data দেখানো।

## আসল সমস্যা
এখন POP portal-এর `ResellerMikrotikUsers.tsx` এবং `ResellerMikrotikBulkCreate.tsx` browser থেকে সরাসরি `supabase.from(...)` query করছে। কিন্তু POP portal login `portal-auth` custom token ব্যবহার করে, Supabase Auth session না। তাই browser-side direct query-গুলো `authenticated` policy পায় না।

ফলাফল:
- query silently fail/empty return হচ্ছে
- UI `error` handle করছে না
- empty array দেখে “কোনো MikroTik server assign করা হয়নি” message দেখাচ্ছে
- Bulk Import-এও same কারণে user list empty হচ্ছে

এজন্য admin-side page-এ running 3 / 4 দেখা গেলেও POP-side page empty দেখাতে পারে।

## কী করা হবে

### ১) POP MikroTik data browser query থেকে portal edge function-এ নেওয়া
`portal-data` edge function-এ POP-specific নতুন actions যোগ করা হবে:
- `get_pop_mikrotik_servers`
- `get_pop_mikrotik_users`
- `get_pop_mikrotik_bulk_candidates`

এই actions token থেকে POP identity resolve করবে:
- `reseller` → `tok.sub`
- `reseller_sub` → `tok.parent_reseller_id`

তারপর server visibility determine করবে:
- same `branch_id`
- অথবা `assigned_to_pop_id = popId`
- অথবা historical fallback: `mikrotik_clients.transferred_to_pop_id = popId`

### ২) Users page-এ direct Supabase query বাদ দিয়ে `callPortal(...)` ব্যবহার
`src/pages/reseller/ResellerMikrotikUsers.tsx` এ:
- `branch_managers`, `mikrotik_devices`, `mikrotik_clients`, `reseller_tariff_packages`, `zones` direct query replace করা হবে
- সব data `portal-data` থেকে আসবে
- loading / error / empty state আলাদা করা হবে

নতুন UX:
- server fetch fail হলে “assign করা হয়নি” না দেখিয়ে proper error দেখাবে
- server zero হলে তবেই empty state দেখাবে
- server থাকলে tab list + users list load হবে

### ৩) Bulk Import page-ও same secure flow-এ আনা
`src/pages/reseller/ResellerMikrotikBulkCreate.tsx` এ:
- direct `mikrotik_devices` + `mikrotik_clients` query বাদ
- `callPortal("get_pop_mikrotik_bulk_candidates")` ব্যবহার
- returned rows-এ only unlinked users থাকবে
- package meta + zone meta edge function থেকে বা centralized portal meta endpoint থেকে আনা হবে

### ৪) Shared POP scoping logic এক জায়গায় রাখা
`portal-data` function-এর ভিতরে helper বানানো হবে:
- POP resolve
- visible MikroTik ids resolve
- branch-scoped / assigned / transferred fallback logic

এতে Users page আর Bulk page-এ আলাদা আলাদা logic drift হবে না।

### ৫) Error handling ঠিক করা
এখন code অনেক জায়গায় `error` ignore করছে। এটা বদলানো হবে:
- function error → toast / inline alert
- no server vs no user vs fetch error — ৩টা state আলাদা
- “Admin-এর সাথে যোগাযোগ করুন” message শুধু actual zero visible server হলে দেখাবে

### ৬) Bulk create submit flow compatible রাখা
Current client creation flow থাকবে, কিন্তু data source secure করা হবে।
প্রয়োজনে bulk create submit-ও পরে `portal-data` action-এ নেওয়া হবে যাতে POP token path consistent থাকে।

## যেসব file বদলাবে
- `src/pages/reseller/ResellerMikrotikUsers.tsx`
- `src/pages/reseller/ResellerMikrotikBulkCreate.tsx`
- `src/lib/portalApi.ts` (যদি typed helper দরকার হয়)
- `supabase/functions/portal-data/index.ts`

সম্ভব হলে shared helper:
- `supabase/functions/portal-data/...` একই file-এর helper section

## কী বদলাবে না
- existing `assigned_to_pop_id` column
- existing branch assignment data
- admin MikroTik Servers page UI
- RLS policy structure

## Expected ফলাফল
1. POP login থেকে wrong “no MikroTik server assigned” message আর দেখাবে না
2. AFTABNAGAR branch-scoped server হিসেবে POP page-এ visible হবে
3. MikroTik Users page-এ actual users দেখাবে
4. Bulk Import page-এ unlinked users আসবে
5. fetch problem হলে empty state না দেখিয়ে error state দেখাবে

## Test cases
1. **Nahid POP login**
   - route: `/pop-admin/mikrotik-users`
   - expected: AFTABNAGAR visible
   - expected: empty state না

2. **Users list**
   - selected server AFTABNAGAR
   - expected: available/transferred/client badges সহ users show

3. **Bulk Import**
   - route: `/pop-admin/mikrotik-users/bulk-create`
   - expected: linked_client_id null users load
   - expected: checkbox/select usable

4. **Failure mode**
   - edge function error simulate হলে
   - expected: “লোড করতে সমস্যা হয়েছে” type message
   - expected: misleading “assign করা হয়নি” না

## Technical note
এটা data problem না, access path problem:
- POP portal uses custom portal token
- browser direct Supabase queries need real Supabase authenticated session
- তাই POP portal-এর sensitive/scoped data `portal-data` edge function দিয়ে আনাই correct pattern
