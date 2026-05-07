## Dashboard Redesign — Remove Duplicates, Add Real Insight

### Problems in current `src/pages/Dashboard.tsx`
- **Duplicate KPIs**: "অনলাইন ক্লায়েন্ট", "সচল ক্লায়েন্ট", "বন্ধ লাইন" appear in both the Hero row and the System Overview grid.
- **Network info block**: shows POP / POP Manager / BW Reseller — user does not want this on the main dashboard.
- **Top Active Users** card has no drill-down page.
- **বকেয়া ক্লায়েন্ট** table is huge and dominates the page.
- Missing: ticket synchronization (pending/active/zone/subzone hotspots) and 12-month trend.

### Changes

**1. Hero KPI Row (4 cards) — keep as the only place these appear**
- মোট ক্লায়েন্ট · অনলাইন ব্যবহারকারী · সচল ক্লায়েন্ট · বন্ধ লাইন

**2. System Overview grid — drop the duplicates**
Remove: অনলাইন ক্লায়েন্ট, সচল ক্লায়েন্ট, বন্ধ লাইন, বকেয়া ক্লায়েন্ট (the last is in Action Required).
Keep: এই মাসের সেল · আজকের সেল · বিলিং ক্লায়েন্ট · মেয়াদোত্তীর্ণ
Add: **পোর্টাল অ্যাক্টিভ ইউজার** (clients with `billing_status = 'Active'` and a portal account) and **পোর্টাল ইনঅ্যাক্টিভ** — link to `/dashboard/clients/home?portal=active|inactive`.

**3. Replace right-rail "নেটওয়ার্ক তথ্য" block** with **Support / Operations** info list:
- পেন্ডিং টিকেট · অ্যাক্টিভ টিকেট · আজকের নতুন টিকেট · টপ সমস্যা জোন · টপ সমস্যা সাবজোন · SMS ব্যালেন্স
Each row clickable → `/dashboard/support/tickets?status=…&zone=…`.

**4. Top Active Users card → make clickable + new page**
- Card heading link "সব দেখুন" → new route `/dashboard/monitoring/top-users`.
- New page `src/pages/dashboard/monitoring/TopUsers.tsx`:
  - Tabs: **এই মাস**, **গত মাস**, **২ মাস আগে** (only previous 2 months kept).
  - Sortable table: Name, Username, Download, Upload, Total — default desc by download.
  - Source: `client_traffic_monthly` (or whatever feeds existing `topDownloadersMonthly` query).
- Wire the route in `src/App.tsx`.

**5. Shrink the বকেয়া ক্লায়েন্ট table**
- Move into a 2-column row with a new **১২-মাসের ট্রেন্ড** chart (line/area: monthly bill vs collection vs due). If <12 months data, start from first month.
- Limit list to top 8 by due, add "সব দেখুন →" linking to existing billing page; remove the 96-row scroll area.
- Compact row: single line `নাম · ৳বকেয়া` with right-aligned amount; no separate bill column.

**6. New "টিকেট সারাংশ" mini-section** (between Action Required and Finance):
- 4 small tiles: ওপেন · ইন-প্রগ্রেস · আজ রিজলভড · গড় রেসপন্স টাইম
- Mini bar showing top 5 zones by open ticket count.

### Technical notes
- Add queries for: portal active/inactive counts (`clients.portal_account_status` or join `portal_users`), tickets group by `zone_id` / `subzone_id`, monthly bill+collect aggregation for last 12 months.
- Add `topDownloaders(monthOffset)` helper returning prev-month and 2-months-ago data for the new TopUsers page (cache by month key).
- All new tiles use existing `MetricTile`, `KpiCard`, `InfoList`, `ResourceGauge`; no new design tokens.
- Keep current theme/tokens — no color/style changes outside swapping which fields appear.

### Files
- edit `src/pages/Dashboard.tsx`
- create `src/pages/dashboard/monitoring/TopUsers.tsx`
- edit `src/App.tsx` (add route)
- (maybe) edit `src/components/dashboard/InfoList.tsx` only if row-link support missing
