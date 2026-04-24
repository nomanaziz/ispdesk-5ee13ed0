

## Home vs Corporate Client — আলাদা View + Corporate-specific Fields

### বর্তমান অবস্থা (যা ইতোমধ্যে আছে)

- `clients.client_type` column **already আছে** — value: `"Home"` / `"Corporate"` (`client_types` table-এ ২টা entry configured)
- `clients.connection_type` column আছে (Optical Fiber / Wireless / NTTN / UTP)
- `clients.protocol_type` column আছে (PPPoE, etc.) — কিন্তু **Static / BGP-এর কোনো structured field নেই**
- Add Client form-এ "Client Type" dropdown আছে, default `"Home"`
- Client List-এ filter আছে কিন্তু **separate page নেই** — সব mixed
- Current data: ১৪ জন client, সবাই কার্যত Home/PPPoE

**সমস্যা:** Admin এক নজরে দেখতে পারে না "কতজন Home, কতজন Corporate"। আর Corporate client-এর জন্য Static IP / BGP AS Number / Peer IP-এর মতো dedicated field-ও নেই।

---

### আলাদা করার দরকার আছে কি?

**হ্যাঁ — তবে আলাদা table নয়, আলাদা view + কয়েকটা extra field।**

কারণ:
- Billing, invoice, package, MikroTik integration — সব **same logic**। আলাদা table করলে সব duplicate হবে, maintenance nightmare।
- শুধু **presentation** আর কিছু **corporate-only fields** আলাদা হলেই কাজ চলে।
- Client নিজের invoice তো same portal-এই দেখবে — আলাদা portal লাগবে না।

**সমাধান:** একই `clients` table, কিন্তু sidebar-এ আলাদা menu + Corporate-specific extra columns + dedicated dashboard widget।

---

### কী বানাব

#### ১. Sidebar-এ আলাদা ২টা sub-menu (existing "ক্লায়েন্ট" group-এর নিচে)

```
ক্লায়েন্ট
├── সকল ক্লায়েন্ট (existing — all)
├── 🏠 হোম ক্লায়েন্ট    ← NEW (filtered: client_type='Home')
├── 🏢 কর্পোরেট ক্লায়েন্ট ← NEW (filtered: client_type='Corporate')
├── নতুন রিকোয়েস্ট
└── ...
```

#### ২. Database migration — Corporate-specific fields যোগ

`clients` table-এ optional columns যোগ:
| Column | Type | Use |
|--------|------|-----|
| `static_ip` | text | Corporate-এর assigned static IP/subnet (e.g. `103.x.x.0/29`) |
| `routing_protocol` | text | "Static" / "BGP" / "OSPF" / "None" dropdown |
| `bgp_as_number` | text | BGP AS number (যদি BGP হয়) |
| `peer_ip` | text | ISP-এর peer IP |
| `bandwidth_committed_mbps` | numeric | CIR (Committed Information Rate) |
| `bandwidth_burst_mbps` | numeric | Burst limit |
| `sla_uptime_percent` | numeric | SLA % (e.g. 99.5) |
| `company_name` | text | Corporate-এর registered company name |
| `trade_license_no` | text | Trade license/BIN |
| `contact_person` | text | Primary contact person (different from `name`) |

সব **nullable** — Home client-এ effect পড়বে না।

#### ৩. New Pages

**A. `src/pages/dashboard/clients/HomeClients.tsx`**
- `ClientList.tsx`-এর pattern reuse — কিন্তু default filter `client_type='Home'` (locked, dropdown hide)
- Columns: Code | Name | Mobile | Zone | Package | Username | Expire | Due | Status | Actions
- "নতুন হোম ক্লায়েন্ট" button → AddClient page-এ `?client_type=Home` prefill

**B. `src/pages/dashboard/clients/CorporateClients.tsx`**
- Same pattern, locked filter `client_type='Corporate'`
- **Different columns (Corporate-specific):** Code | Company | Contact Person | Mobile | Static IP | Bandwidth (CIR/Burst) | Routing | SLA | Monthly Bill | Due | Status | Actions
- "নতুন কর্পোরেট ক্লায়েন্ট" button → AddClient page-এ `?client_type=Corporate` prefill (corporate-only fields visible)

#### ৪. AddClient page — Conditional sections

`AddClient.tsx`-এ:
- `client_type` যদি `"Corporate"` হয় → একটা নতুন **"কর্পোরেট তথ্য"** card show হবে যাতে: Company Name, Trade License, Contact Person, Static IP, Routing Protocol dropdown, BGP AS, Peer IP, Committed/Burst bandwidth, SLA %
- `client_type='Home'` হলে এই section hide

#### ৫. Dashboard widget update (`src/pages/Dashboard.tsx`)

Existing "Home Client" stat-এর পাশে **"Corporate Client"** stat যোগ:
```
🏠 হোম ক্লায়েন্ট: 245    🏢 কর্পোরেট ক্লায়েন্ট: 18
```
ইতোমধ্যে `client_type='Home'` দিয়ে count হচ্ছে (line 100-102) — শুধু Corporate-এর জন্য parallel query যোগ।

#### ৬. Invoice/Portal — কোনো change নেই ✅

Client login portal (`/portal`) already invoice show করে `client_id` দিয়ে — Home/Corporate উভয়েই same view পাবে। আলাদা করার দরকার নেই (আপনি নিজেই বললেন)।

---

### Files

| File | Action |
|------|--------|
| Supabase migration | `clients`-এ ১০টা nullable column যোগ |
| `src/pages/dashboard/clients/HomeClients.tsx` | NEW |
| `src/pages/dashboard/clients/CorporateClients.tsx` | NEW (different columns) |
| `src/pages/dashboard/clients/AddClient.tsx` | Conditional "Corporate Info" section |
| `src/components/AppSidebar.tsx` | "হোম ক্লায়েন্ট" + "কর্পোরেট ক্লায়েন্ট" menu items |
| `src/App.tsx` | ২টা নতুন route |
| `src/pages/Dashboard.tsx` | Corporate count widget যোগ |

---

### Outcome

- Sidebar থেকে এক click-এ **শুধু Home** বা **শুধু Corporate** client দেখা যাবে
- Corporate client-এর Static IP, BGP info, SLA — সব structured ভাবে save + table-এ visible
- Dashboard-এ এক নজরে count: কতজন Home, কতজন Corporate
- Invoice/billing/portal — কোনো change নেই, সব আগের মতোই কাজ করবে
- Database একটাই, duplicate logic নেই — শুধু view + extra optional fields

