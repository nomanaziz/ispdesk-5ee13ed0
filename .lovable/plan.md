

## BW Customer Panel — Self-Service Extras (MikroTik / Billing / Clients)

### বুঝতে পারলাম
1. **Brand/Reseller relation** = admin-এর সাথে। তার price/billing — BW customer-কে দেখাতে হবে (✓ already fixed)।
2. Manage Your Clients থেকে **Trial / Paid plan** নিলে BW customer পাবে একটা **POP Admin-এর clone portal**।
3. কিন্তু সে পাবে **বাড়তি ৩টা feature** যা POP Admin-এ নেই:
   - নিজে **MikroTik সার্ভার যোগ** করতে পারবে
   - নিজের **Billing List** তৈরি করতে পারবে  
   - নিজের **Client List** তৈরি করতে পারবে
4. এই extra menu-গুলো নিচে **আলাদা section হিসেবে** থাকবে — উপরে standard POP Admin menus, নিচে নতুন BW-only menus।

---

### Architecture (যা বদলাবে না)
- BW customer panel activate করলে → `/pop-admin/*` shell-এই ঢোকে (existing flow ঠিক আছে)।
- POP Admin (reseller)-রা এই extra menu দেখবে **না** — শুধু BW-customer + active panel হলেই দেখবে।
- Routes: BW-only extras `/pop-admin/bw/*` prefix-এ যাবে যাতে guard আলাদা রাখা যায়।

---

### পরিবর্তন

**1. `src/components/ResellerLayout.tsx` — sidebar-এ নতুন section**
- `usePortalAuth()` থেকে check: `customer.type === "bw_customer" && panelActive`।
- যদি true হয়, existing `groups` array-এর শেষে একটা visual divider + heading **"আমার নিজস্ব সেটআপ / My Own Setup"** দেখাবে।
- নিচে নতুন group:
  ```
  নিজস্ব সেটআপ (My Setup)
   ├─ MikroTik সার্ভার যোগ        → /pop-admin/bw/mikrotik
   ├─ আমার ক্লায়েন্ট তালিকা         → /pop-admin/bw/clients
   ├─ ক্লায়েন্ট যোগ                → /pop-admin/bw/clients/add
   └─ আমার বিলিং তালিকা           → /pop-admin/bw/billing
  ```
- Section-টা subtle background tint (e.g. `bg-emerald-500/5`) + sparkles icon দিয়ে visually আলাদা।

**2. New pages (thin wrappers — existing components reuse করবে)**
- `src/pages/bw-customer/setup/BwMikrotikSetup.tsx` — existing MikroTik device CRUD UI reuse, scoped to `customer.sub` via new `useBwOwnerScope()` hook।
- `src/pages/bw-customer/setup/BwClientList.tsx` — reuse `ClientList` কিন্তু `bw_owner_id = customer.sub` filter সহ।
- `src/pages/bw-customer/setup/BwClientAdd.tsx` — reuse `ClientAdd` form, auto-set `bw_owner_id`।
- `src/pages/bw-customer/setup/BwBillingList.tsx` — reuse billing list, filter by BW owner।

**3. `src/App.tsx` — নতুন routes**
নতুন 4-5 route যোগ হবে, সবগুলো `BwPanelProtectedRoute`-এ wrapped (নতুন guard যা BW customer + active panel দুটোই check করে)।

**4. `src/components/BwPanelProtectedRoute.tsx`** (নতুন)
- BW customer ছাড়া যে কাউকে `/pop-admin/dashboard`-এ redirect।
- Panel inactive হলে `/bw/dashboard`-এ redirect (upgrade prompt)।

**5. Database (migration)**
- `mikrotik_devices`, `clients`, `bw_billing` (বা equivalent table) — যোগ হবে `bw_owner_id uuid REFERENCES bw_sale_customers(id)` column (nullable; POP Admin records-এ NULL থাকবে)।
- RLS update: BW customer JWT (`anon` role + `tok.sub`) শুধু own-rows access পাবে, যেখানে `bw_owner_id = tok.sub`।
- Edge function (যেখানে relevant) এ `bw_owner_id` auto-fill।

---

### যা বদলাবে না
- Existing POP Admin reseller pages, RBAC, layout
- Default `/bw/*` 5-page portal (Dashboard, Invoices, Service Orders, Tickets, Settings)
- `Manage Your Clients` upgrade modal এবং trial/payment flow
- Other portals (client, reseller_sub)

---

### Outcome
- Trial / paid panel active করলে BW customer ঢুকবে `/pop-admin/dashboard`-এ — POP Admin look-এ।
- Sidebar-এর উপরের অংশে standard POP groups (Dashboard, Configuration, Employee, Client, Monitoring, etc.) — সব same।
- নিচে আলাদা subtle-tinted section: **"আমার নিজস্ব সেটআপ"** with MikroTik add, own client list/add, own billing list।
- নিজের added MikroTik / clients / billing শুধু সে নিজে দেখবে (RLS-protected by `bw_owner_id`)।
- POP Admin (reseller) এই extra section-টা দেখবে না।

