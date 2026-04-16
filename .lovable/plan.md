

## Dashboard Colorful Redesign + Stats Enhancement

Screenshot (image-57) অনুযায়ী Dashboard-এর stat cards গুলো colorful icon সহ redesign করা হবে এবং নতুন stats যোগ হবে। Online Monitoring table-এ Mac Address, Last Offline columns যোগ হবে।

---

### 1. Dashboard — Colorful StatCard Redesign

Screenshot-এর মতো প্রতিটি card-এ বড় colorful square icon থাকবে (solid background সহ):
- লাল, নীল, সবুজ, হলুদ, বেগুনি, পিংক — প্রতিটি row-এ ৬টি card

**নতুন Stats যোগ হবে:**

| Card | Data Source |
|------|------------|
| Total Client | `clients` count |
| This Month Join | `clients` where `created_at >= month_start` |
| Last Month Join | `clients` where `created_at` in last month |
| This Month Active | `clients` active + `created_at >= month_start` |
| Last Month Active | billing paid last month count |
| Home Client | `clients` where `connection_type = 'Home'` count |
| Total Active Now | `clients` active count |
| Home Active Now | Home + active count |
| Total Expired | `clients` expired count |
| Home Expired | Home + expired |
| Pending Client | `clients` pending |
| Left Client | `clients` left |
| Extended Client | `clients` extended status |
| Grace Client | `clients` grace status |
| Due Client | billing unpaid this month |
| Suspend Client | `clients` suspended |
| Today Home Sales | billing paid today |
| Yesterday Home Sales | billing paid yesterday |
| This Month Sales | billing total paid this month |
| This Month Profit | income - expense |
| Last Month Profit | last month income - expense |
| Online In This Month | unique online sessions |
| Total POP | network_pops count |
| Last Month Sales | billing paid last month |

**Bottom Section — 3টি Table:**
- **Latest Invoices** (Inv No, User, Amount)
- **Upcoming Expire** (Username, Bill, Expire Time)
- **Latest Expired** (Username, Bill, Expire Time)

### 2. Online Monitoring — Mac Address ও Last Offline Column

Table-তে নতুন columns:
- **Mac Address** — `caller_id` from active session (already available)
- **R.Days** — remaining days (from billing expire date)
- **Last Offline** — `client_traffic_logs` last record where client went offline

Edge function-এ `caller-id` already আসে, শুধু UI-তে Mac Address column যোগ করতে হবে।

---

### Files

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | পুরো redesign — colorful cards, নতুন stats, bottom tables |
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | Mac Address, R.Days columns যোগ |

