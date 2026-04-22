

## লক্ষ্য
Customer Portal-এর **Live Usage** page-এ গ্রাহক দেখতে পারবে:
1. বর্তমান মাসে **কোন দিন কত GB** ডাটা use হয়েছে (daily breakdown)
2. **এই মাসের মোট** + **আগের মাসগুলোর মোট** (monthly summary, দিনভিত্তিক ভাঙা ছাড়া)

---

## সমাধান

### 1. Live Usage page-এ ২টা নতুন section যোগ
বর্তমান page (Connectivity Info + Online status + Live speed + Real-time graph) এর **নিচে** যোগ হবে:

#### A. **This Month — Daily Usage** (current month)
- Bar chart: X-axis = তারিখ (1-31), Y-axis = GB
- প্রতিটা bar-এ Download + Upload stacked (or grouped)
- উপরে summary chip: "এই মাসে মোট: ↓ XX GB · ↑ YY GB · মোট ZZ GB"
- শুধু **চলতি মাসের** data দেখাবে (1 তারিখ থেকে আজ পর্যন্ত)

#### B. **Monthly Summary** (past months)
- Compact table/list: প্রতি row = এক মাস
- Columns: Month (Nov 2025), Download, Upload, Total
- শেষ ৬ মাস দেখাবে, "View More" দিলে আরো load
- পরের মাস শুরু হলে আগের মাস automatic এই list-এ চলে আসবে (daily breakdown আর show করব না সেই মাসের জন্য — শুধু total)

---

## Technical Details

### Data source
- **Daily breakdown**: `client_traffic_logs` থেকে aggregate
  - প্রতি tick-এ snapshot আছে (`upload_bytes`, `download_bytes` = session counter)
  - **Delta computation**: একই day-এর consecutive rows-এর difference নিতে হবে; counter reset (current < prev) হলে current-কে delta ধরব
  - SQL: window function `LAG()` দিয়ে delta বের করে date-wise SUM
- **Monthly totals**: `client_traffic_monthly` (already populated by collector)
  - Direct SELECT, order by month DESC

### Backend changes
**File: `supabase/functions/portal-data/index.ts`** — দুটো নতুন action:

1. `get_daily_usage` — current month daily breakdown
   ```sql
   WITH ordered AS (
     SELECT recorded_at::date AS day, upload_bytes, download_bytes,
            LAG(upload_bytes) OVER (ORDER BY recorded_at) AS prev_up,
            LAG(download_bytes) OVER (ORDER BY recorded_at) AS prev_dn
     FROM client_traffic_logs
     WHERE client_id = $1 AND recorded_at >= date_trunc('month', now())
   )
   SELECT day,
          SUM(GREATEST(upload_bytes - COALESCE(prev_up, upload_bytes), 0)) AS up,
          SUM(GREATEST(download_bytes - COALESCE(prev_dn, download_bytes), 0)) AS dn
   FROM ordered GROUP BY day ORDER BY day;
   ```
   Note: edge function-এ raw SQL allowed না — তাই client-side aggregation: `client_traffic_logs` থেকে current month rows fetch করে JS-এ delta + group।

2. `get_monthly_usage` — last 12 months
   - Direct query: `client_traffic_monthly` filter by client_id, order desc, limit 12

### Frontend changes
**File: `src/pages/portal/PortalLiveUsage.tsx`** — page-এর শেষে নতুন ২টা Card:
- React Query (15-min staleTime, না polling — historical data)
- Recharts BarChart (daily) + simple table (monthly)
- Empty-state: "এখনও data সংগ্রহ হয়নি"

### Files modified
1. `supabase/functions/portal-data/index.ts` — 2 new actions
2. `src/pages/portal/PortalLiveUsage.tsx` — 2 new sections at bottom

---

## Out of scope
- Hour-by-hour breakdown
- Per-day download করার option
- Comparison chart (this month vs last month)

---

## Apply-এর পরে expected
1. Live Usage page-এ scroll down করলে চলতি মাসের প্রতিদিনের usage bar chart দেখাবে।
2. তার নিচে আগের মাসগুলোর summary table থাকবে (শুধু মাসিক total)।
3. মাস শেষ হলে সেই মাস automatically monthly summary-তে চলে যাবে।

