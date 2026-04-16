

## Global Client Search + Enhanced Client Profile Page

Screenshot অনুযায়ী একটি comprehensive client search system তৈরি করা হবে।

---

### 1. TopBar-এ Global Search

**`src/components/TopBar.tsx`** — Header-এ একটি search input/button যোগ হবে:
- Search icon click করলে একটি Command palette style dialog (Cmd+K style) open হবে
- Type করলে `clients` table-এ `name`, `client_id`, `contact`, `username` দিয়ে search হবে (debounced)
- Matching results dropdown-এ দেখাবে (নাম, ID, contact, status badge)
- কোনো result click করলে **new tab-এ** `/dashboard/billing/client/:id` open হবে (`window.open`)

### 2. ClientProfile Page Enhancement

**`src/pages/dashboard/billing/ClientProfile.tsx`** — বর্তমান page-কে screenshot-এর মতো A-to-Z তথ্য সহ সাজানো:

**Page-এর উপরে Search bar** — এই page-এ থাকা অবস্থাতেই অন্য client search করে switch করা যাবে (navigate to new ID)।

**Screenshot অনুযায়ী sections (Tabs হিসেবে):**

| Tab | Data |
|-----|------|
| **Personal Info** | নাম, পিতা, মাতা, NID, ঠিকানা, email, phone (already exists) |
| **Connection Info** | Username, password, MAC, server, connection type, ONU, fiber (already exists) |
| **Service Info** | Package, speed, monthly bill, billing start, expire date (already exists) |
| **MikroTik Info** | PPP status, uptime, download/upload, caller ID, live traffic (already exists) |
| **All Recharge History** | `bill_collections` table — সব collection records |
| **PPPoE Login History** | `system_logs` or `client_traffic_logs` — session history |
| **Service Bill History** | `billing` table — মাসভিত্তিক বিল (already exists as "invoices") |
| **Current Bill Timeline** | Current month billing progress visualization |
| **Customer Health/Status Log** | Connection/disconnection history from logs |
| **Custom Changelog** | Any changes made to client record |

**Left sidebar enhancement:**
- Profile photo placeholder with client initial
- Quick action buttons (Enable/Disable, Message, Package change, Download info)
- Status badges (Online/Offline, Billing status, MikroTik status)

### 3. Files

| File | Change |
|------|--------|
| `src/components/TopBar.tsx` | Global search dialog যোগ — Command palette style |
| `src/components/GlobalClientSearch.tsx` | **নতুন** — Search dialog component (debounced search, results list, new tab open) |
| `src/pages/dashboard/billing/ClientProfile.tsx` | Page-এ inline search bar + নতুন tabs (Recharge History, PPPoE Login, Bill Timeline, Changelog) |

