## ISP ERP — Final Sales-Readiness Audit Report

পুরো codebase ঘুরে দেখলাম। নিচে চারটা section-এ মিলিয়ে report দিচ্ছি, এবং কী action নেব সেটাও।

---

### 1) Menu language fixes (keyword → English)

আপনার নিয়ম: তথ্যপ্রযুক্তির keyword (Dashboard, Reports, OLT, HR, Payroll, etc.) **English** থাকবে; বর্ণনামূলক শব্দ Bangla থাকবে।

**Group labels যেগুলো পাল্টানো হবে** (`src/components/AppSidebar.tsx`):

| বর্তমান | পরিবর্তন → |
|---|---|
| ড্যাশবোর্ড | Dashboard |
| রিপোর্ট | Reports |
| ইনভেন্টরি | Inventory |
| অ্যাকাউন্টিং | Accounting |
| সিস্টেম | System |
| কনফিগারেশন | Configuration |
| ব্যান্ডউইথ ক্রয় | Bandwidth Purchase |
| ব্যান্ডউইথ ক্লায়েন্ট | Bandwidth Clients |
| নেটওয়ার্ক মনিটরিং | Network Monitoring |
| নেটওয়ার্ক ডায়াগ্রাম | Network Diagram |
| HR ও পেরোল | HR & Payroll |
| SMS সার্ভিস | SMS Service |
| ই-কমার্স | E-Commerce |
| ওয়েবসাইট প্যানেল | Website Panel |
| সাপোর্ট ও টিকেটিং | Support & Ticketing |
| টাস্ক ম্যানেজমেন্ট | Task Management |
| ডিভাইস | Devices |
| অ্যাসেট | Assets |
| বিক্রয় ও সার্ভিস | Sales & Service |
| ক্রয় | Purchase |

**Item-level mix-language fixes:**
- `কর্মী Loan` → `Employee Loan`
- `About পেজ` → `About Page`
- প্রতিটা গ্রুপের ভিতরে `ড্যাশবোর্ড` → `Dashboard`

**যা যেমন আছে রাখব:** "All Clients" (already English), "OLT Power Dashboard", "Live Traffic", "Online Client Monitoring" — সব ঠিক আছে।

---

### 2) Module completeness — সব মডিউল চলে?

প্রায় **সব মডিউল real implementation** (Supabase queries, full CRUD)। শুধু **একটাই filler** খুঁজে পাওয়া গেছে:

- `/pop-admin/monitoring/ping` — POP Admin portal-এ Ping Tools এখনো "শীঘ্রই আসছে" placeholder (`src/pages/reseller/PopPlaceholder.tsx`)। Main dashboard-এ Ping Tools complete; শুধু reseller portal-এ port করা বাকি।

বাকি ২৫+ মডিউল (HR, Payroll, Billing, OLT, Network, Inventory, Accounting+Capital, E-Commerce, Website CMS, SMS, Reports, Tasks, Support, Purchase, Sales, VAS, Configuration, System) — সবগুলো production-ready।

---

### 3) Login portals — কোনগুলো আছে, কোনগুলো নেই

সব login এক জায়গায়: `/login` page তিন method চেষ্টা করে (email → Supabase Auth, username → app-user-login edge function, username/password → portalLogin → type-based redirect)।

**✅ কাজ করে:**
- Admin/Employee → `/dashboard`
- Home/Corporate client → `/portal/dashboard`
- Reseller (POP Admin) → `/pop-admin/dashboard`
- Reseller sub-user → `/pop-admin/dashboard`
- Bandwidth customer → `/bw/dashboard`

**❌ Gap (sale-এর আগে fix করা দরকার):**
1. **BW customer-এর client-দের login**: BW tenant তার নিজের client add করে কিন্তু তাদের জন্য আলাদা portal route নেই। ওরা generic `/portal/dashboard`-এ যায় — BW tenant-এর branded portal-এ যায় না।
2. **Per-reseller white-label portal**: সব reseller-এর retail client একই generic portal দেখে। POP-ভিত্তিক branding নেই।
3. **Dedicated login URLs** (`/bw/login`, `/pop-admin/login`, `/portal/login`) সবগুলো `/login`-এ redirect করে — sales material-এ এটা document করা দরকার, অথবা প্রত্যেকের জন্য আলাদা branded entry page বানানো দরকার।

---

### 4) Global unique client code — এখন নেই

এখন প্রতি table-এ আলাদা code field:
- `clients.client_code`
- `bw_sale_customers.customer_code`
- `branch_managers.pop_code` + `client_code`
- `employees` → শুধু UUID, human-readable code নেই
- `app_users.username` → structured code না

**সুপারিশ (Phase-2 কাজ):** একটা **global `uid`** column সব user-type table-এ যোগ করা — format `{TYPE}-{TENANT}-{SEQ}`, যেমন:
- `CL-ISP001-00421` (client)
- `BW-ISP001-00012` (bandwidth customer)
- `POP-ISP001-00003` (reseller)
- `EMP-ISP001-00089` (employee)
- `USR-ISP001-00007` (app user)

এতে সব মডিউল থেকে একই search box দিয়ে যে কোনো user-type খুঁজে পাওয়া যাবে; invoice/contract/SLA-তে globally unique reference থাকবে।

---

### Saleability verdict

**Ready to sell after these fixes:**
- ✅ সব core ERP মডিউল live এবং Supabase-backed
- ✅ Authentication, RBAC, multi-tenancy, RLS — সব hardened (আজকের security pass-এ ৬টা finding fix হয়েছে)
- ✅ Capital/Funding, Cash-on-Hand guard, Events & Leave + government holiday import, Bangladeshi context — সব আছে

**ছাড়ার আগে প্রয়োজনীয় কাজ:**
- 🔧 Menu language consistency (এই plan-এ)
- 🔧 BillingList "পরিশোধ" button-এ permission guard (আগের audit থেকে carry-over)
- 🔧 ClientActionButtons-এ BILLING|Billing List write permission accept করা
- 🔧 POP Admin Ping Tools port

**Phase-2 (sales pitch deck-এ "roadmap" হিসেবে রাখা যায়):**
- 📋 Global unique `uid` system সব user-type-এ
- 📋 Per-reseller white-label client portal
- 📋 BW tenant-এর client-দের জন্য আলাদা portal context

---

## যে কাজ Build mode-এ এখনই করব

আপনি OK বললে নিচের চারটা **এই round-এই** করে দেব:

1. **AppSidebar.tsx**: উপরের তালিকা অনুযায়ী group labels ও mixed-language items English-এ ফিরিয়ে আনব (label-only — route/permission key অপরিবর্তিত)।
2. **BillingList.tsx**: inline "পরিশোধ" button-এ `BILLING|Billing List` write permission guard যোগ।
3. **ClientActionButtons.tsx**: `canEdit`-এ `BILLING|Billing List` write permission যোগ — যাতে শুধু Billing write থাকলেও বিল রিসিভ দেখা যায়।
4. **PopAdmin Ping Tools**: placeholder সরিয়ে main `PingTools.tsx` component reuse করে port করা।

**এই round-এ করব না (আলাদা চাইলে পরে):**
- Global `uid` system → DB schema migration লাগবে সব user-type table-এ, frontend refactor অনেক জায়গায়। আলাদা task হিসেবে।
- BW tenant client portal / per-reseller white-label → নতুন routes, layouts, branding system। আলাদা task।

বললে শুরু করি।