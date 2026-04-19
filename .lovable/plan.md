

## লক্ষ্য
1. Sidebar-এর "ড্যাশবোর্ড" group আগের মতো রাখা — তিনটি sub-item: **মূল ড্যাশবোর্ড**, **OLT/ONU ওভারভিউ**, **ওয়েবসাইট ড্যাশবোর্ড**।
2. **`/dashboard` route-এর মূল content পরিবর্তন** — এখন এটা "বিলিং ওভারভিউ" দেখায়; এর বদলে নতুন **Company Overview** dashboard দেখাবে।
3. পুরাতন বিলিং-ভিত্তিক বিশাল dashboard সরিয়ে **Billing module-এর নিচে** "বিলিং ওভারভিউ" হিসেবে নিয়ে যাওয়া (অথবা Accounting-এর নিচে — Billing-এর নিচেই recommend করছি যেহেতু আগে ওটাই ছিল)।

## পরিবর্তন

### 1. নতুন Page: `src/pages/dashboard/CompanyOverview.tsx`
Owner/Admin-এর জন্য short summary dashboard। Sections:

**Header**: Company Name (system_settings → company_info থেকে) + logo + tagline "কোম্পানি ওভারভিউ"

**Stat Cards (গ্রিড)**:
- মোট হোম ক্লায়েন্ট (`clients` count)
- সক্রিয় ক্লায়েন্ট / নিষ্ক্রিয় / চলে গেছে
- বিল পরিশোধ করেছে (এই মাসে) / বাকি আছে — `bills` table থেকে
- POP ম্যানেজার সংখ্যা (`pop_managers` / branches)
- POP-এর অধীনে মোট ক্লায়েন্ট
- ব্যান্ডউইথ রিসেলার সংখ্যা (`bw_sale_pops` count)
- প্রতি BW reseller-এর sub-user কাউন্ট (`bw_reseller_users` group by reseller) — ছোট তালিকা

**Quick Cards Row**:
- আজকের কালেকশন (৳)
- চলতি মাসের কালেকশন
- মোট বকেয়া
- অনলাইন ক্লায়েন্ট (cached `is_online`)

**Mini Tables**:
- Top 5 BW Reseller (sub-user count সহ)
- POP wise client summary (top 5)

ছোট, পরিচ্ছন্ন — পুরা billing detail নয়।

### 2. Route পরিবর্তন: `src/App.tsx`
- `/dashboard` → নতুন `CompanyOverview` component
- `/dashboard/billing-overview` → পুরাতন `Dashboard` component (rename করা হবে না, reuse)

### 3. Sidebar পরিবর্তন: `src/components/AppSidebar.tsx`
- "ড্যাশবোর্ড" group items:
  - "মূল ড্যাশবোর্ড" → `/dashboard` (icon: LayoutDashboard)
  - "OLT/ONU ওভারভিউ" → `/dashboard/olt-overview` (অপরিবর্তিত)
  - "ওয়েবসাইট ড্যাশবোর্ড" → `/dashboard/website` (অপরিবর্তিত)
- "বিলিং ওভারভিউ" item সরিয়ে **"হোম ক্লায়েন্ট"** group-এর ভেতরে "বিলিং তালিকা"-এর ঠিক উপরে যোগ করা → `/dashboard/billing-overview`

### 4. Company name fetch
`useSystemSetting<CompanyInfo>("company_info", defaults)` hook ব্যবহার করে company name + logo টপে দেখানো হবে। Title: `{company_name} — কোম্পানি ওভারভিউ`

## টেকনিক্যাল বিবরণ
- পুরাতন `Dashboard.tsx` (668 lines) **delete হবে না** — শুধু route পরিবর্তন; এটা `/dashboard/billing-overview`-তে serve হবে।
- নতুন `CompanyOverview.tsx` ছোট ও দ্রুত load — শুধু `count: "exact", head: true` queries ব্যবহার করব (data fetch নয়), যাতে instant render হয়।
- Tables queried: `clients`, `bills` (or equivalent), `bw_sale_pops`, `bw_reseller_users`, `pop_managers`/`branches`, `bill_collections`।
- React Query, 60s refetch interval।

## Files
- ✏️ `src/pages/dashboard/CompanyOverview.tsx` (নতুন তৈরি)
- ✏️ `src/App.tsx` (route swap + import)
- ✏️ `src/components/AppSidebar.tsx` (sidebar item move + label change)

## কী **হবে না**
- কোনো page delete হবে না
- পুরাতন বিশাল billing dashboard-এর code touch হবে না — শুধু route পরিবর্তন
- Accounting/OLT/Website dashboards অপরিবর্তিত

