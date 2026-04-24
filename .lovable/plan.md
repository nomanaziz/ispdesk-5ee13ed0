

## MikroTik Server — দুটো বিষয় পরিষ্কার করা ও fix করা

### ১. "Assigned POP" column-এর ব্যাখ্যা (কেন আছে)

আপনার admin-এর `মাইক্রোটিক সার্ভার` page (`/dashboard/mikrotik/servers`) — এটা আপনার **central pool** যেখানে আপনার ISP-এর সব physical MikroTik routers থাকে।

Column-টার কাজ:
- প্রতিটি MikroTik router সাধারণত একটা নির্দিষ্ট **POP/branch**-এর নিচে install করা থাকে (যেমন AFTABNAGAR POP-এ একটা router)।
- "Assigned POP" দিয়ে আপনি সেই router-কে সেই POP-এর সাথে link করেন।
- Link হওয়ার পর সেই **POP Admin** তার নিজের panel-এ login করে শুধু তার assigned router(s) দেখতে পায়, তার client গুলো ওই router-এ create হয়, billing match হয়।
- "Unassigned" মানে router-টা এখনো কোনো POP-এর সাথে যুক্ত না — central admin শুধু দেখবে, কোনো POP দেখবে না।

এটা একটা **routing/ownership marker** — কে কোন router manage করবে সেটা ঠিক করে। দরকারি জিনিস, hide করার দরকার নেই।

---

### ২. BW Customer Panel-এ MikroTik add option যোগ করা

**বর্তমান সমস্যা:** `/bw-panel/mikrotik` page (`PopScopedListPage` reuse করছে) — শুধু read-only list, কোনো Add/Edit/Delete button নেই। BW customer self-service করতে পারে না।

**সমাধান:** Admin-এর full-featured `Servers.tsx`-এর মতো একটা **scoped version** তৈরি করব BW Panel-এর জন্য — customer নিজেই তার MikroTik add/edit/delete + status check করতে পারবে। POP assignment automatic হবে (নিজের POP-এ)।

#### পরিবর্তন

**A. নতুন file: `src/pages/bw-panel/BwPanelMikrotikServers.tsx`**

- `Servers.tsx`-এর pattern follow করবে (একই UI: যোগ করুন button + table + Status check + Toggle + Edit + Delete)।
- **Differences:**
  - `usePopScope()` থেকে `branchId` নেবে → query শুধু `.eq("branch_id", branchId)` ও `.eq("assigned_to_pop_id", popId)` দিয়ে scoped।
  - Insert করার সময় auto-fill: `branch_id = customer.branch_id`, `assigned_to_pop_id = customer.id` — customer manually কিছু select করবে না।
  - Header: "মাইক্রোটিক সার্ভার" + "যোগ করুন" button + Status check।
  - Admin-only "Assigned POP" column বাদ — customer-এর জন্য irrelevant।
  - Bulk Import / Import Users link বাদ (Phase 2-এ আনা যাবে)।
- Add dialog-এ fields: Name, IP, Username, Password, API Port (default 8728), Version, Timeout, Order — হুবহু admin-এর মতো।

**B. `src/pages/bw-panel/wrappers.ts` update**

```ts
// before
export { default as BwPanelMikrotik } from "@/pages/reseller/config/PopDevices";
// after
export { default as BwPanelMikrotik } from "@/pages/bw-panel/BwPanelMikrotikServers";
```

**C. RLS পরীক্ষা (`mikrotik_devices` table)**

- যেহেতু BW customer portal session থেকে operate করছে (admin auth না), RLS policy verify করতে হবে যে portal session-এর JWT দিয়ে BW customer তার নিজের `branch_id`-এ insert/update/delete করতে পারে।
- প্রয়োজন হলে নতুন RLS policy যোগ করতে হবে — যেমন:
  - `SELECT/INSERT/UPDATE/DELETE` allowed where `branch_id = (jwt portal_branch_id)` এবং `assigned_to_pop_id = (jwt sub)` BW customer type-এর জন্য।
- Admin's existing access untouched।

**D. Edge function check**

- `check-mikrotik-status` already device-id দিয়ে কাজ করে — কোনো change লাগবে না।
- Client create / billing flow — already `mikrotik_id` দিয়ে scoped, BW customer add করা router সাথে সাথে dropdown-এ আসবে।

---

### Files to change/create

| File | Change |
|------|--------|
| `src/pages/bw-panel/BwPanelMikrotikServers.tsx` | **NEW** — full CRUD scoped to BW customer |
| `src/pages/bw-panel/wrappers.ts` | Re-export from new file |
| Supabase migration | Add/verify RLS policies on `mikrotik_devices` for BW portal sessions |

---

### Outcome

- **Admin-এর Assigned POP column = clear:** আপনি admin হিসেবে কোন router কোন POP-এর হবে assign করেন, যাতে সেই POP customer তার panel-এ সেটা দেখে।
- **BW customer self-service:** "যোগ করুন" button পাবে, নিজের router add করে username/password/IP দেবে, সাথে সাথে list-এ আসবে, status check + toggle + edit + delete সব করতে পারবে।
- **Auto-link:** customer-এর add করা router automatic তার নিজের POP-এ assigned হবে — manual select-এর confusion নেই।
- বাকি সব flow (client create, billing, online monitoring) যেহেতু `mikrotik_id` দিয়ে কাজ করে, সব কিছু auto-চলবে — কোনো নতুন logic লাগবে না।

