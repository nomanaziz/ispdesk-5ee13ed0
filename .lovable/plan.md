# Serial Plan — Notifications, Subscription Visibility, Custom Domain

বড় ৩টা feature। একে একে phase করে delivery করব। Phase 1 approve করলেই কাজ শুরু — পরে phase by phase add করব।

---

## Phase 1 — Notification Bell চালু (TopBar)

### Goal
TopBar-এর Bell icon click করলে একটা popover/sheet খুলবে যেখানে real-time admin notifications দেখাবে।

### Notification Sources (সব database থেকে query)
1. **নতুন Shop Order** — `shop_orders` table থেকে last 7 days এ `status='pending'` orders।
2. **Website থেকে নতুন Connection Request** — `clients` (or relevant request table) এ `status='new_request'` rows।
3. **Reseller / BW Customer Bill Paid** — `reseller_pgw_payments` বা `bw_sale_invoices` এ recent `status='paid'` রo।
4. **Reseller / POP Low/Negative Balance** — `branch_managers.balance < threshold` (e.g. < 500)।
5. **Subscription Expiring** — `bw_sale_customers.panel_subscription_expires_at` এর next 7 days এ যা expire হবে + already expired।

### Tech
- New file `src/components/notifications/AdminNotificationBell.tsx`:
  - React Query দিয়ে উপরের ৫টা source parallel fetch।
  - প্রতিটা notification: icon + title + meta + timestamp + action link।
  - Unread badge count + "Mark all read" (localStorage seen-ids দিয়ে track, light-weight)।
  - Real-time: Supabase channel subscribe করে `shop_orders` insert + `bw_sale_customers` update।
- `src/components/TopBar.tsx`: existing dummy `<Button><Bell/></Button>` (line 144-153) replace করব `<AdminNotificationBell />` দিয়ে।

### Out of Scope (Phase 1)
- Server-side notifications table (পরে দরকার হলে আনব)। এখন derived from existing tables।

---

## Phase 2 — Admin's Own Subscription Page

### Context (clarification needed)
Memory note: "Codebase is Project 2 (ISP ERP). SaaS portal (Project 1) is not in this repository." মানে এই admin (যিনি ISP চালাচ্ছেন) তার নিজের SaaS subscription / package / renewal — সেগুলো অন্য codebase / অন্য DB তে থাকার কথা। কিন্তু আপনি বললেন "database তো একই" — তাহলে আমরা **`bw_sale_customers`** model টাকে use করতে পারি (ওইটাই panel_user_limit / panel_subscription_expires_at / current_tier_id হোল্ড করে — যেটা SaaS billing model)।

### Plan (assuming shared DB)
নতুন route `/dashboard/my-subscription`:
- কোন package/tier active (`current_tier_id` → `bw_panel_pricing_slabs`)
- User limit vs active count (`active_client_count / panel_user_limit`)
- Subscription start / expiry / renew date (`panel_subscription_expires_at`)
- Next month estimated bill (`next_month_estimated_bill`)
- Recent panel subscription invoices (`bw_panel_subscription_invoices` if exists, otherwise `income_entries` filtered by `source='panel_subscription'`)
- "Renew" / "Upgrade plan" button (UI only initially; payment hook পরে)

### Where to attach
- Sidebar: "সিস্টেম" group এ "আমার Subscription" item add।
- TopBar user dropdown এও shortcut।

### If DB তে এই admin-এর subscription record না থাকে
যখন current logged-in admin এর কোনো `bw_sale_customers` row নেই, page একটা empty state দেখাবে: "Your subscription is managed externally — contact your provider"। পরে link/lookup logic add করব।

---

## Phase 3 — Custom Domain Setup (Per Admin/Reseller/Client)

### Goal
প্রতি admin (tenant) তার নিজের domain এ portal serve করতে পারবে — main admin, reseller, client portal সবগুলো same domain এর under।

### Two parts

**A) Database + UI (এই codebase এ করব)**
- Migration: `tenant_domains` table:
  ```
  id, tenant_id (FK → tenants/branches/bw_sale_customers, polymorphic),
  domain text unique, verification_token text,
  status enum('pending','verifying','active','failed'),
  created_at, verified_at, ssl_issued_at
  ```
- New route `/dashboard/system/custom-domain`:
  - "Add domain" form
  - DNS instructions panel (A/CNAME records to point at our edge)
  - Verification status + manual "Re-check" button
  - Edge function `verify-custom-domain`: DNS lookup করে token TXT match করলে `status='active'`।
- Subdomain routing logic update (`tenantContext`): incoming hostname এ `tenant_domains` lookup → tenant resolve।

**B) DNS / Reverse-proxy / SSL (manual ops — আপনার কথা মতে "মানুষ করে দেবে")**
- প্রতি verified domain এর জন্য infra team Caddy/Nginx এ SSL provision (Let's Encrypt) + reverse proxy point করবে main app এ।
- এই part automatic করা যাবে না এই codebase থেকে (Lovable preview এ SSL/edge control নেই) — যদি Lovable custom domain ব্যবহার করি তাহলে per-tenant একটা করে domain Lovable Project Settings এ add করা লাগবে, যেটা manual।

### Limitations to flag
- Lovable hosting per project max custom domain limit আছে — multi-tenant wildcard domain চাইলে আপনার own infra (VPS + Caddy) দরকার হতে পারে।
- এই phase এ DB + UI + verification edge function build করব; actual edge SSL automation আপনার ops manual handle করবে।

---

## Execution Order
1. **Phase 1 (Notification Bell)** — প্রায় ১টা component + TopBar swap। DB schema change নেই। ফাস্ট।
2. **Phase 2 (Subscription Page)** — UI + read-only queries। Schema change নেই (existing `bw_sale_customers` use)।
3. **Phase 3 (Custom Domain)** — Migration + UI + edge function + tenant resolver wiring। সবচেয়ে বড়।

### Recommended next step
Phase 1 approve করুন — এখনই implement শুরু করব। Phase 2 আর 3 আলাদা message এ approve নিয়ে আগাব যাতে scope creep না হয়।

### Questions before Phase 2 / 3
- Phase 2: এই codebase এর currently logged-in admin কীভাবে `bw_sale_customers` এর সাথে link হবে? (email match? `panel_branch_id = profiles.branch_id`?) — এটা আমাকে confirm করুন।
- Phase 3: Lovable hosting এ থাকবে নাকি আপনার own VPS এ deploy হবে? — multi-tenant custom domain এর strategy এর উপর নির্ভর করে।
