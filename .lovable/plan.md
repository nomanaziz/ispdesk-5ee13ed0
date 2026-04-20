
## লক্ষ্য
POP reseller portal-কে admin portal-এর সাথে একই logic-এ আনা, যাতে POP side-এ আলাদা “simplified” module না থাকে। পার্থক্য শুধু scope: POP তার নিজের `branch_id` / `tariff_id` / fund data দেখবে।

## এখনকার মূল সমস্যা
1. `AddClient` আংশিক POP-aware, কিন্তু tariff/package/source এখনও fragile — `tariff_id` না থাকলে package ফাঁকা।
2. Zone/Sub-zone/Box/Department/Designation pages এখন `PopScopedCrud` দিয়ে simplified version — admin page-এর full hierarchy, filters, relations নেই।
3. Client side-এ কিছু admin page reuse হয়েছে, কিন্তু Billing side-এ menu/route mismatch আছে — client list, billing list, daily collection, client profile একই flow নয়।
4. Fund balance dashboard-এ আছে, কিন্তু POP portal-এ এটা consistent navigation/module হিসেবে নেই।
5. `client_types`, `billing_statuses`, connection/protocol configs global হওয়া উচিত — POP side-এ same source ব্যবহার করতে হবে, custom duplicate না।
6. `ResellerLayout`-এর menu admin structure থেকে আলাদা, তাই UX-এ mismatch তৈরি হচ্ছে।

## Final implementation approach

### ১. POP portal-এ “same page, scoped data” pattern finalize
নতুন simplified POP CRUD/page আর ব্যবহার করা হবে না যেখানে admin page already আছে।

এই pages-গুলোকে POP-aware reuse করা হবে:
- `src/pages/dashboard/clients/AddClient.tsx`
- `src/pages/dashboard/clients/ClientList.tsx`
- `src/pages/dashboard/billing/BillingList.tsx`
- `src/pages/dashboard/billing/DailyCollection.tsx`
- `src/pages/dashboard/billing/ClientProfile.tsx`
- `src/pages/dashboard/clients/LeftClients.tsx`
- `src/pages/dashboard/clients/Scheduler.tsx`
- `src/pages/dashboard/config/Zones.tsx`
- `src/pages/dashboard/config/SubZones.tsx`
- `src/pages/dashboard/config/Boxes.tsx`
- `src/pages/dashboard/hr/Departments.tsx`
- `src/pages/dashboard/hr/Positions.tsx`

### ২. Shared POP scope utility-কে standard source বানানো
`src/hooks/usePopScope.ts` already আছে। এটাকেই সব reused admin page-এ standard scoping source করা হবে।

এখানে final contract থাকবে:
- `isPopMode`
- `branchId`
- `popId`
- `tariffId`
- `districtId`
- `upazilaId`
- `popName`

`src/lib/popScope.ts` ও `usePopScope.ts`-এর duplicate logic এক জায়গায় consolidate করা হবে, যাতে dashboard/menu/form/list সব same scope নেয়।

### ৩. Add Client flow পুরো finalize
`src/pages/dashboard/clients/AddClient.tsx`-এ already partial logic আছে; এটাকে stable করা হবে।

#### Package source
POP mode-এ package source হবে only:
- `branch_managers.tariff_id`
- `reseller_tariff_packages`
- linked `isp_packages`

#### Required POP auto fields
- District / Upazila: POP profile থেকে auto
- Server: POP default server / tariff server থেকে auto
- Protocol: `PPPoE`
- Profile: selected tariff package থেকে auto
- Client type / billing status / connection type: global config table থেকে same as admin

#### Validation/banner
যদি নিচের যেকোনোটা missing হয়:
- `branch_id`
- `tariff_id`
- default MikroTik server

তাহলে page-এ clear blocking banner দেখাবে:
- কেন package আসছে না
- admin কী assign করতে হবে

#### Client code logic
- POP prefix hint থাকবে
- global duplicate check থাকবে
- username → client code helper sync থাকবে, কিন্তু override allowed

### ৪. Billing parity complete করা
User expectation অনুযায়ী client module + billing module exact same flow করা হবে।

#### Route structure update
POP routes-এ নিচের admin pages wire করা হবে:
- `/pop-admin/clients` → `ClientList`
- `/pop-admin/clients/add` → `AddClient`
- `/pop-admin/clients/billing` → `BillingList`
- `/pop-admin/clients/left` → `LeftClients`
- `/pop-admin/clients/scheduler` → `Scheduler`
- `/pop-admin/billing/list` → `BillingList`
- `/pop-admin/billing/daily-collection` → `DailyCollection`
- `/pop-admin/billing/client/:id` → `ClientProfile`

`/pop-admin/billing/invoice` ও `/pop-admin/billing/profile` placeholder route-গুলো remove/redirect করা হবে যেন duplicate dead menu না থাকে।

#### Billing page scoping
`DailyCollection.tsx` ও `ClientProfile.tsx`-এ POP scope যোগ হবে:
- collections query → selected client’s `branch_id` / joined client filter
- client search → only same branch
- bill receive dialog → only same branch active clients
- profile page access → POP অন্য branch-এর client profile খুলতে পারবে না
- back/search navigation admin route না গিয়ে POP route use করবে

### ৫. Config parity complete করা
User requirement অনুযায়ী Zone/Sub-zone/Box/Department/Designation admin-এর মতো same থাকবে।

#### Zone / Sub-zone / Box
বর্তমান simplified files:
- `src/pages/reseller/config/PopZones.tsx`
- `src/pages/reseller/config/PopSubZones.tsx`
- `src/pages/reseller/config/PopBoxes.tsx`

এগুলো thin wrapper বা direct route reuse-এ বদলানো হবে।

Admin pages-এ POP mode support যোগ হবে:
- `Zones.tsx`: query + insert/update/delete + division/district/upazila filter → `branch_id` scoped
- `SubZones.tsx`: zone dropdown only this POP’s zones
- `Boxes.tsx`: zone/subzone dropdown only this POP’s data

#### Department / Designation
বর্তমান `PopScopedCrud` version বাদ দিয়ে:
- `/pop-admin/config/departments` → admin `Departments.tsx`
- `/pop-admin/config/designations` → admin `Positions.tsx`

Admin CRUD page-এ optional branch scoping যোগ হবে, কারণ user exact same feature চেয়েছেন।

### ৬. Shared config tables same source রাখা
এই global tables POP/admin দুদিকেই same থাকবে:
- `client_types`
- `billing_statuses`
- `connection_types_config`
- `protocol_types`

কাজ:
- POP pages-এ এগুলো admin-এর মতো same query source-এ থাকবে
- POP side-এ আলাদা duplicate CRUD/addition থাকবে না
- menu language-এও বোঝানো হবে এগুলো shared config

### ৭. Reseller dashboard fund/package visibility ঠিক করা
`src/pages/reseller/ResellerDashboard.tsx`-এ already `branch_managers.balance` এবং BW invoice stats আছে। এটাকে user expectation অনুযায়ী clearer করা হবে।

#### Dashboard improvements
- current fund balance prominent card
- tariff assigned/not assigned status card
- package count from `reseller_tariff_packages`
- missing assignment warning:
  - no tariff
  - no server
  - no branch
- client/billing shortcuts admin-parity routes-এ যাবে

### ৮. Reseller sidebar/menu admin structure-এর সাথে align
`src/components/ResellerLayout.tsx` update হবে।

#### Changes
- duplicate/placeholder menu কমানো
- client/billing labels admin terms অনুযায়ী সাজানো
- working routes only দেখানো
- billing menu-তে actual pages:
  - Billing List
  - Daily Collection
- client menu-তে:
  - Add Client
  - Client List
  - Billing Client
  - Left Client
  - Scheduler
- config menu-তে exact shared modules

এতে user “ওইটার সাথে এটার কোন মিল নাই” problem দূর হবে।

## Files likely to modify

### Core routing/layout
- `src/App.tsx`
- `src/components/ResellerLayout.tsx`

### Shared scope/auth
- `src/hooks/usePopScope.ts`
- `src/lib/popScope.ts`
- `src/contexts/PortalAuthContext.tsx`
- `supabase/functions/portal-auth/index.ts` (only if any missing portal payload field is still needed)

### Client/Billing pages
- `src/pages/dashboard/clients/AddClient.tsx`
- `src/pages/dashboard/clients/ClientList.tsx`
- `src/pages/dashboard/clients/LeftClients.tsx`
- `src/pages/dashboard/clients/Scheduler.tsx`
- `src/pages/dashboard/billing/BillingList.tsx`
- `src/pages/dashboard/billing/DailyCollection.tsx`
- `src/pages/dashboard/billing/ClientProfile.tsx`

### Config/HR pages
- `src/pages/dashboard/config/Zones.tsx`
- `src/pages/dashboard/config/SubZones.tsx`
- `src/pages/dashboard/config/Boxes.tsx`
- `src/pages/dashboard/hr/Departments.tsx`
- `src/pages/dashboard/hr/Positions.tsx`

### POP wrappers to simplify/retire
- `src/pages/reseller/config/PopZones.tsx`
- `src/pages/reseller/config/PopSubZones.tsx`
- `src/pages/reseller/config/PopBoxes.tsx`
- `src/pages/reseller/config/PopDepartments.tsx`
- `src/pages/reseller/config/PopDesignations.tsx`

### Dashboard
- `src/pages/reseller/ResellerDashboard.tsx`

## Data work needed
Schema change likely লাগবে না এই batch-এ।

কিন্তু existing POP records-এ verify/backfill লাগতে পারে:
- `branch_managers.branch_id`
- `branch_managers.tariff_id`
- `branch_managers.server_id`
- related `reseller_tariff_packages` rows

এগুলো missing থাকলে UI fix করলেও package/fund/server fully show করবে না। তাই implementation-এর সাথে targeted data verification/update থাকবে।

## Expected end result
শেষে POP portal-এ:
- client add admin-এর মতো same
- client list same
- billing list same
- daily collection same
- scheduler same
- zone/subzone/box same hierarchy UI
- department/designation same CRUD
- tariff package properly visible
- fund balance clearly visible
- difference শুধু data scope: নিজের POP-এর data only

## Out of scope
- public portal changes
- new DB schema redesign
- new billing architecture
- employee/payroll/report/sms/monitoring full parity beyond the routes/pages listed above
