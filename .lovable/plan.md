

## Live Traffic Fix + Traffic Data Collection + Dashboard Enhancement

৩টি বড় কাজ: (1) Live Traffic dialog ঠিক করা — offline user-এর জন্যও cumulative data দেখানো, (2) Monthly traffic summary table তৈরি + Top Downloaders, (3) Dashboard-এ screenshot-এর মতো সব তথ্য যোগ করা।

---

### 1. Live Traffic Dialog Fix

**সমস্যা:** Offline user-এ "Live Traffic" click করলে "User offline" দেখায় কারণ MikroTik-এ active session নেই।

**সমাধান:** Dialog-এ দুটো section থাকবে:
- **Live Traffic** (শুধু online হলে) — realtime bps/pps
- **Cumulative Traffic** (সবসময়) — `client_traffic_logs` থেকে total upload/download + session history table

Dialog-তে:
- User offline হলে: "User is offline" badge + cumulative data (total upload, total download from `clients.total_upload/total_download`)
- User online হলে: live bps + current session bytes + cumulative total
- Recent traffic history table (last 20 entries from `client_traffic_logs`)

### 2. Monthly Traffic Summary Table + Top Downloaders

**নতুন DB table:** `client_traffic_monthly`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| client_id | uuid FK | client reference |
| username | text | PPP username |
| month | date | month (YYYY-MM-01) |
| total_upload | bigint | monthly total upload bytes |
| total_download | bigint | monthly total download bytes |
| unique(client_id, month) | | |

**Edge function update:** `collect-client-traffic` function-এ monthly table-ও update হবে — current month-এর row-তে delta যোগ হবে (upsert)।

**Dashboard-এ Top Downloaders section:**
- "Weekly Top Downloaders" — last 7 days `client_traffic_logs` aggregate
- "Monthly Top Downloaders" — `client_traffic_monthly` current month
- Bar chart বা table format-এ top 10

### 3. Dashboard — Full Enhancement (Screenshot অনুযায়ী)

Screenshot-এ যা আছে সব যোগ হবে:

**নতুন Stat Cards (যেগুলো নেই):**
- Running Clients, Renewed Clients, Deactivated Clients, Waiver Clients
- Billing Clients, Paid Clients, Partially Paid, Unpaid Clients
- Online Clients, Blocked Clients, Bill Date Expire, Unpaid Extension
- Total Pop, Total Pop Clients, Enabled Pop Clients, Disabled Pop Clients

**নতুন Financial Cards (bottom section):**
- Monthly Bill (total), Collected Bill, Discount, Total Due
- Service Sales Invoice, Product Sales Invoice, Income, Expense
- Credited Amount, POP Fund, POP Bill, Receivable Amount
- B.Width Provider Bill, B.Width Provider Due, B.Width POP Bill, Paid Salary
- SMS Balance, Purchase Payable Due, Purchase Paid Amount, Cash On Hand

**নতুন Charts/Tables:**
- Zone Wise Problem Occurrence (donut chart)
- Sub-Zone Wise Problem Occurrence (donut chart)
- Monthly Problem Occurrence (donut chart)
- Pending Tickets, Processing Tickets, Pending Task, Processing Task cards
- Most Problem Solver (horizontal bar chart — top employees)
- Monthly New Client (bar chart)
- Company Performance - Active Client (bar chart — monthly)
- Top 20 Unpaid Client (table)

**Charts-এ recharts library ব্যবহার হবে** (already installed)।

### 4. collect-client-traffic — Monthly Aggregation

`collect-client-traffic/index.ts`-এ monthly upsert যোগ:
```
await supabase.from("client_traffic_monthly").upsert({
  client_id, username, month: currentMonthStart,
  total_upload: existingUpload + uploadDelta,
  total_download: existingDownload + downloadDelta,
}, { onConflict: "client_id,month" });
```

---

### Files

| File | Change |
|------|--------|
| Migration SQL | `client_traffic_monthly` table তৈরি |
| `supabase/functions/collect-client-traffic/index.ts` | Monthly aggregation upsert যোগ |
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | Live Traffic dialog-এ cumulative data + traffic history |
| `src/pages/Dashboard.tsx` | সম্পূর্ণ redesign — সব stat cards, charts, tables, top downloaders |

