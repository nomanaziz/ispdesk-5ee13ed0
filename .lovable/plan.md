## Goal
ড্যাশবোর্ডের সব stat card-কে clickable বানানো — click করলে যেই page-এ data filter হয়ে যাওয়ার কথা, সেখানে query-param সহ navigate হবে। সাথে কিছু অপ্রয়োজনীয় section বাদ দেয়া। (Branch-ভিত্তিক sorting/সমাধান card এই round-এ বাদ — পরের subject।)

## কাজের তালিকা

### ১. Stat card → filter route mapping
প্রতিটি card-কে `<Link>` দিয়ে wrap করা হবে। গন্তব্য page query-string থেকে initial filter বসাবে।

| Card | Destination | Filter (query) |
|---|---|---|
| মোট ক্লায়েন্ট | `/dashboard/clients/home` (all clients) | none |
| এই মাসে যোগ | `/dashboard/clients/home` | `?from=<monthStart>&to=<today>` |
| গত মাসে যোগ | `/dashboard/clients/home` | `?from=<lmStart>&to=<lmEnd>` |
| হোম ক্লায়েন্ট | `/dashboard/clients/home` | `?clientType=Home` |
| কর্পোরেট ক্লায়েন্ট | `/dashboard/clients/corporate` | `?clientType=Corporate` |
| সচল ক্লায়েন্ট | `/dashboard/clients/home` | `?status=active` |
| হোম অ্যাক্টিভ | `/dashboard/clients/home` | `?clientType=Home&status=active` |
| বিলিং ক্লায়েন্ট | `/dashboard/clients/home` | `?billingStatus=Active` |
| ফ্রি ক্লায়েন্ট | `/dashboard/clients/home` | `?billingStatus=Free` |
| পার্সোনাল ক্লায়েন্ট | `/dashboard/clients/home` | `?billingStatus=Personal` |
| VIP ক্লায়েন্ট | `/dashboard/clients/home` | `?vip=1` |
| ওভারডিউ বিলিং | `/dashboard/billing` | `?paymentStatus=unpaid` |
| বন্ধ লাইন | `/dashboard/clients/home` | `?mikrotikStatus=disabled` |
| মেয়াদোত্তীর্ণ | `/dashboard/clients/home` | `?status=expired` |
| নিষ্ক্রিয়/বাতিল | `/dashboard/clients/home` | `?status=inactive` |
| গ্রেস/এক্সটেনশন | `/dashboard/clients/home` | `?status=extended` |
| পেন্ডিং ক্লায়েন্ট | `/dashboard/clients/home` | `?status=pending` |
| পেইড / আংশিক / বকেয়া | `/dashboard/billing` | `?paymentStatus=paid|partial|unpaid` |
| অনলাইন ONU | `/dashboard/monitoring/online` | none |
| মোট POP | `/dashboard/branches/managers` | none |
| POP ম্যানেজার cards | `/dashboard/branches/managers` | (type অনুযায়ী) |
| BW রিসেলার cards | `/dashboard/bw-sale/pop` / `/dashboard/bw-sale/customers` | none |
| আজকের সেল / গতকালের সেল | `/dashboard/billing/daily-collection` | `?date=...` |
| এই মাসের / গত মাসের সেল | `/dashboard/billing/daily-collection` | `?from=...&to=...` |
| পেন্ডিং / প্রক্রিয়াধীন টিকেট | `/dashboard/support/tickets` | `?status=pending|processing` |
| পেন্ডিং / প্রক্রিয়াধীন টাস্ক | `/dashboard/tasks` | `?status=pending|processing` |

আর্থিক বিবরণ (মোট বিল, কালেক্টেড, ডিসকাউন্ট, আয়, ব্যয়, বেতন, SMS) — যেখানে relevant accounting/SMS page আছে সেখানে link করা হবে; না থাকলে non-clickable রাখা হবে।

### ২. ClientList / BillingList query-param support
`ClientList.tsx` এবং `BillingList.tsx`-এ `useSearchParams` যোগ করা হবে। Mount-এ URL param থেকে `defaultFilters`-এর উপর override বসিয়ে initial state সেট করা হবে। সমর্থিত key: `status`, `clientType`, `billingStatus`, `mikrotikStatus`, `paymentStatus`, `from`, `to`, `vip`, `month`, `date`. Filter UI আগের মতোই — শুধু initial value pre-fill হবে।

### ৩. StatCard component update
`StatCard`-এ optional `to?: string` prop যোগ করা হবে। থাকলে পুরো card `<Link>`-এ wrap হবে এবং hover-এ subtle shadow বাড়বে।

### ৪. বাদ যাওয়া section (Dashboard.tsx থেকে remove)
- "সর্বশেষ ইনভয়েস" table
- "আসন্ন মেয়াদোত্তীর্ণ" table
- "সর্বশেষ মেয়াদোত্তীর্ণ" table
- পুরো bottom 3-column grid এবং সংশ্লিষ্ট useStats ফেতchগুলো (`latestBilling`, `upcomingExpire`, `latestExpired`) মুছে ফেলা হবে যাতে অপ্রয়োজনীয় query না হয়।

### ৫. বকেয়া তালিকা
"টপ ২০ বকেয়া ক্লায়েন্ট" → title হবে "বকেয়া ক্লায়েন্ট"; query-র `.limit(20)` সরিয়ে limit বাড়িয়ে 200 করা হবে এবং scroll container আগের মতোই থাকবে। প্রতিটি row name-এ click করলে `/dashboard/billing?search=<client_id>` এ যাবে।

### ৬. Defer (পরের subject)
- Branch-ভিত্তিক "সবচেয়ে বেশি সমস্যা সমাধান" / "কোন branch থেকে বেশি line" — এই card এখন add হবে না।

## Files to edit
- `src/pages/Dashboard.tsx` — StatCard-এ `to` prop, items-এ link map, bottom 3 table block ও অপ্রয়োজনীয় queries মুছে ফেলা, top-unpaid limit + row click।
- `src/pages/dashboard/clients/ClientList.tsx` — `useSearchParams` দিয়ে initial filter pre-fill।
- `src/pages/dashboard/billing/BillingList.tsx` — একই ভাবে initial filter pre-fill (paymentStatus / from / to / search)।

কোনো DB migration লাগবে না।
