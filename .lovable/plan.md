## Goal
ড্যাশবোর্ডকে reference image (Unique WiFi style) এর মতো **professional, modern** look দেয়া। বর্তমান dense Vuexy-style cards-এর জায়গায় বড়, gradient-rich, "View Details" link সহ stat cards এবং পরিষ্কার section দিয়ে redesign।

## Reference image থেকে নেয়া design pattern

```
┌──────────────────────────────────────────────────────────────┐
│ Top KPI Row — 4 large cards (icon + huge number + % delta)   │
│   Total Users   Online Users   Active Users   Offline Users  │
├──────────────────────────────────────────────────────────────┤
│ System Overview (left, 2/3)         │ System Resources (1/3) │
│  ┌────┐┌────┐┌────┐┌────┐           │  CPU / Memory / Disk   │
│  │Onl ││Act ││Inc ││Tdy │           │  (3 donut gauges)      │
│  └────┘└────┘└────┘└────┘           │                        │
│  ┌────┐┌────┐┌────┐┌────┐           │  Router Information    │
│  │ IP ││Exp ││Sus ││Due │           │  (key-value list)      │
│  └────┘└────┘└────┘└────┘           │                        │
├──────────────────────────────────────┴────────────────────────┤
│ Traffic Overview (chart, 2/3)        │ Top Active Users (1/3) │
└──────────────────────────────────────────────────────────────┘
```

প্রতিটি colored card:
- Gradient bg (e.g. blue/sky, emerald/teal, amber/orange, rose/red)
- Top: small uppercase label
- Middle: huge bold number
- Bottom: small "View Details →" link (entire card clickable, link route আগের plan অনুযায়ী)

## কাজের তালিকা

### ১. নতুন `KpiCard` ও `MetricTile` components (`src/components/dashboard/`)
- `KpiCard.tsx`: বড় hero card — gradient bg, icon top-right, label, value, delta (+12.5%), bottom-right subtle "View Details →"। Click → route।
- `MetricTile.tsx`: medium gradient tile — System Overview-এর ৮টা item (Online Customers, Active Customers, Total Income 30 Days, Today's Income, IP Binding, Expired, Suspended, Due Customers). Click → route।
- `ResourceGauge.tsx`: donut gauge (recharts RadialBar) — CPU/Memory/Disk percent।
- `InfoList.tsx`: Router Information style key-value list।

প্রতিটি component fully token-driven (`bg-gradient-to-br from-primary to-primary-glow` ধাঁচের) — direct color class নয়, design tokens ব্যবহার করে।

### ২. Design tokens (`src/index.css` + `tailwind.config.ts`)
নতুন gradient tokens যোগ করা হবে যাতে cards uniform থাকে:
```css
--gradient-card-blue, --gradient-card-emerald, --gradient-card-amber,
--gradient-card-rose, --gradient-card-violet, --gradient-card-cyan
--shadow-card-elevated
```
এগুলা HSL ভিত্তিক, dark/light উভয় mode-এ কাজ করবে।

### ৩. `src/pages/Dashboard.tsx` rewrite (লেআউট only — data hook reuse)

বর্তমান `useStats()` hook অপরিবর্তিত থাকবে। নতুন layout:

**Section A — Hero KPIs (4 cards, large)**
| Card | Value | Route |
|---|---|---|
| মোট ক্লায়েন্ট | totalClients | `/dashboard/clients/home` |
| অনলাইন ব্যবহারকারী | onlineOnu | `/dashboard/monitoring/online` |
| সচল ক্লায়েন্ট | totalActive | `/dashboard/clients/home?status=active` |
| অফলাইন/বন্ধ | blockedLineCount | `/dashboard/clients/home?mikrotikStatus=disabled` |

প্রতিটিতে month-on-month delta (+/- %) দেখানো হবে (thisMonthJoin vs lastMonthJoin proportion থেকে calc).

**Section B — System Overview (8 metric tiles, 2 rows × 4)**
Online Customers, Active Customers, এই মাসের সেল, আজকের সেল | বিলিং ক্লায়েন্ট, মেয়াদোত্তীর্ণ, বন্ধ লাইন, বকেয়া ক্লায়েন্ট। প্রতিটি card-এ "বিস্তারিত দেখুন →"।

**Section C — System Resources (right rail, ~1/3 width)**
- ৩টা donut gauge: ONU অনলাইন%, পেইড%, কালেকশন% (current month progress)
- "সিস্টেম তথ্য" list: মোট POP, POP ম্যানেজার, BW রিসেলার, MikroTik server count

**Section D — Traffic / Sales chart (২/৩) + Top Active Users (১/৩)**
- Chart: existing monthly new clients line/area chart, redesigned with gradient stroke + area fill।
- Top Active Users: top downloaders বা সচল ক্লায়েন্টের একটা compact list (avatar/initials + name + status badge)।

**Section E — Action Required & Finance (collapsible, secondary)**
আগের "অ্যাকশন প্রয়োজন", "আর্থিক বিবরণ", "সাপোর্ট ও টাস্ক" section গুলা smaller `MetricTile`-এ আলাদা rows-এ থাকবে (clickable, আগের route mapping বহাল)।

**বাদ:**
- পুরনো dense `StatCard` grid (২-৩ লাইনে ১৬+ small card)। সব cards হবে নতুন design system-এর অংশ।
- "POP ও BW নেটওয়ার্ক" এবং "BW রিসেলার পোর্টাল" sections — System Resources rail-এ summary হিসেবে চলে যাবে।

**রাখা হবে:**
- "বকেয়া ক্লায়েন্ট" table — সেটাকে নতুন card style-এ wrap করা হবে।

### ৪. Visual details
- Card padding বড় (p-5/p-6), rounded-2xl
- Big numerical font (text-3xl / text-4xl, tracking-tight, font-extrabold)
- Soft shadow (`shadow-lg shadow-primary/5`), hover-এ `-translate-y-0.5` + `shadow-xl`
- Icon background: white/15 frosted box top-right
- Delta badges: +12.5% green pill, -2.1% red pill
- Section headings: uppercase, tracking-widest, muted-foreground

### ৫. Bengali labels everywhere
সব hard-coded label বাংলায়।

### ৬. Files to create / edit
- `src/index.css` — gradient + shadow tokens
- `tailwind.config.ts` — token mapping
- `src/components/dashboard/KpiCard.tsx` — নতুন
- `src/components/dashboard/MetricTile.tsx` — নতুন
- `src/components/dashboard/ResourceGauge.tsx` — নতুন
- `src/components/dashboard/InfoList.tsx` — নতুন
- `src/pages/Dashboard.tsx` — layout rewrite (data hook + filter routes অপরিবর্তিত)

কোনো DB migration বা useStats পরিবর্তন নেই — শুধু visual/layout overhaul, পূর্বের clickable-routing plan এ যা যা mapping ছিল সব বহাল থাকবে।

### ৭. Out of scope (পরের subject — আগেও বলা হয়েছে)
- Branch-ভিত্তিক "সবচেয়ে বেশি সমস্যা সমাধান" / branch leaderboard card
