

## Client Portal — Beautiful, App-like Redesign

### লক্ষ্য

Client portal-কে image-এর মতো **সুন্দর, mobile/app-friendly** redesign করা। Admin portal যেমনই হোক, গ্রাহকের portal হবে premium-feel।

### Current State

বর্তমানে আছে: `PortalDashboard`, `PortalInvoices`, `PortalPurchaseOrders`, `PortalSupport` (empty placeholder), `PortalLayout` (basic dark sidebar)।

বাকি যা লাগবে: Live Usage, Notices, Company Info, Movie/FTP Servers, My Ledger, full Support Ticket system + conversation।

### নতুন Layout (Image-অনুসরণে)

**Sidebar (left, dark)** — collapsible mobile drawer:
- User avatar + name + "Signed in" badge উপরে
- NAVIGATION group:
  - 🏠 Dashboard
  - 📈 Live Usage
  - 📢 Notices
  - 🏢 Company Info
  - 🎬 Movie/FTP Servers
  - 📒 My Ledger
  - 🧾 Invoices
  - 🎧 Support Tickets
- ACCOUNT group: Logout

**Top bar:** "Customer Portal" centered, Logout (username) right। Mobile-এ hamburger left, brand center।

### Pages

#### 1. Dashboard (Hero Card + Stats + Service/Client Details + Billing Info)
- **Hero card** (gradient pastel): বড় avatar + Name + package badge + status pills (Active / Online / username) + right side action buttons (View Invoices, Support Ticket, Pay Now)
- **5 stat cards** row: Monthly Bill, Service, Package, Join Date, Ledger Balance (Paid badge)
- **Service Overview** card + **Client Details** card (2-column grid)
- **Billing Info** strip: Monthly Bill, Last Payment Date, Payment Status
- **Notice strip** (যদি active notice থাকে): top-এ scrolling/highlighted banner

#### 2. Live Usage
- Real-time bandwidth chart (recharts) — placeholder যদি data না থাকে, "Coming soon" graceful state
- Daily/Monthly usage summary cards

#### 3. Notices (নতুন)
- Admin-published notices list (`notices` / `events` table থেকে)
- Card layout: title, date, body, attachment
- Unread badge

#### 4. Company Info
- ISP company details (logo, address, hotline, email, payment instructions) — `system_settings` থেকে read

#### 5. Movie / FTP Servers (নতুন)
- Card grid: server name, type (FTP / Live TV / Movie), URL, login info (যদি থাকে)
- "Open" button → opens link in new tab
- Source: নতুন `media_servers` table (পরে seed করা যাবে)

#### 6. My Ledger
- Transaction history (debit/credit) — `client_payments` + `bw_sales_invoices` থেকে
- Running balance column
- Date filter

#### 7. Invoices (existing — refresh design only)
- Card-style invoice rows (image-এর pastel theme), Pay button per due invoice

#### 8. Support Tickets (full rebuild)
- **List view:** open/closed tabs, ticket cards (subject, last update, status badge)
- **Create ticket dialog:** category select, subject, description, priority, attachment
- **Detail view:** full conversation thread (client ↔ admin), reply box, status timeline
- Source: existing `support_tickets` + নতুন `support_ticket_messages` table

### Database

**নতুন tables:**

| Table | Purpose |
|-------|---------|
| `media_servers` | FTP / Live TV / Movie server entries (name, type, url, username, password, branch_id, active, sort_order) |
| `support_ticket_messages` | Threaded ticket conversations (ticket_id, sender_type 'client'/'admin', sender_id, message, attachment_url, created_at) |
| `client_notices` (or reuse `notices`) | Admin-published client-facing notices (title, body, type, target: all/branch/zone, starts_at, ends_at, attachment_url) |

**Existing reuse:**
- `bw_sales_invoices` / `clients` / `client_payments` for billing info
- `support_tickets` for ticket headers (already has it)
- `system_settings` for company info

**RLS:** Portal token-based read (client can see only own data) — already pattern exists।

### Mobile / App-friendliness

- Layout shifts to **bottom-nav-bar** on small screens (Dashboard / Notices / Tickets / Ledger / More)
- Cards full-width, touch-friendly buttons (min 44px)
- Hero card stacks vertically on mobile
- Sidebar becomes drawer (hamburger)
- Safe-area padding (iOS notch friendly)
- PWA manifest + apple-touch-icon → "Add to Home Screen" করলে native app feel
- Smooth route transitions

### Theming

- **Light pastel theme** for client portal (image-এর মতো soft blue/purple gradient hero, white cards, subtle borders) — admin theme থেকে আলাদা
- Sidebar dark, content light (image-এর মতো)
- Status pills: Active=violet, Online=green, Username=neutral
- বাংলা + English mixed labels OK

### Files

| File | Action |
|------|--------|
| migration | `media_servers`, `support_ticket_messages`, `client_notices` tables + RLS |
| `src/components/PortalLayout.tsx` | Redesign — light theme, new menu items, bottom-nav for mobile |
| `src/pages/portal/PortalDashboard.tsx` | Full rebuild — hero card + stats + service/client details + billing strip + notice banner |
| `src/pages/portal/PortalLiveUsage.tsx` | নতুন |
| `src/pages/portal/PortalNotices.tsx` | নতুন |
| `src/pages/portal/PortalCompanyInfo.tsx` | নতুন |
| `src/pages/portal/PortalMediaServers.tsx` | নতুন |
| `src/pages/portal/PortalLedger.tsx` | নতুন |
| `src/pages/portal/PortalInvoices.tsx` | Redesign cards |
| `src/pages/portal/PortalSupport.tsx` | Full rebuild — list + create + detail conversation |
| `src/components/portal/TicketConversation.tsx` | নতুন |
| `src/components/portal/CreateTicketDialog.tsx` | নতুন |
| `src/components/portal/PortalBottomNav.tsx` | নতুন (mobile) |
| `src/App.tsx` | New portal routes |
| `index.html` + `public/manifest.json` | PWA meta + apple-touch-icon |

### Phasing

- **Phase 1 (এখন):** Layout redesign + Dashboard (image-অনুসরণে) + Notices page + Media Servers page + Support Tickets full system + Bottom-nav + Light theme + DB migration
- **Phase 2:** Live Usage real graph (depends on traffic-collector data), Ledger transactions full, PWA manifest setup, App-icon

Phase 1-এ image-এর exact dashboard look + working notices/tickets/servers পাবেন; Phase 2-এ live data graph ও PWA install। চাইলে Phase 2 এখনই একসাথে করতে পারি — শুধু বললেই হবে।

