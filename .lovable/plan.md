

## Online Client Monitoring পেজ

Screenshot অনুযায়ী MikroTik-এর active PPPoE sessions দেখানোর একটা full-featured monitoring page তৈরি হবে।

---

### 1. Edge Function — Active Session Data

`fetch-mikrotik-ppp`-এ নতুন action `"active-sessions"` যোগ হবে:
- সব enabled MikroTik device-এ `/ppp/active/print` চালাবে
- প্রতি active session-এর `name`, `address` (IP), `uptime`, `caller-id`, `service`, `encoding` return করবে
- সাথে device name (server) ও device id পাঠাবে
- Client DB data (client_id, name, contact, zone, sub_zone, box, connection_type, profile) join করে পাঠাবে

### 2. নতুন Page — `OnlineClientMonitoring.tsx`

**4টি Tab** (screenshot অনুযায়ী):
- **Online Client Monitoring** — active sessions তালিকা
- **Disabled in system enabled in MikroTik** — DB-তে status disabled কিন্তু MikroTik-এ secret enabled
- **Enabled in system disabled in MikroTik** — DB-তে active কিন্তু MikroTik-এ disabled
- **Profile Mismatch** — DB profile ≠ MikroTik profile

**Summary Cards:** Total Users, Online Users, Offline Users

**Filters:** Server, Protocol, Status, Zone, Sub Zone, Box, Connection Type

**Table Columns:** C.Code, ID/IP, Name, Mobile, Zone, Subzone, Box, Connection Type, Server, Profile, Service, IP Address, Status, Duration, Logout Time, Action

**"Sync Clients & Servers" বাটন** — existing `sync-online` action call করবে

### 3. Sidebar ও Route

- `Network Monitoring` submenu-তে সবার উপরে "Online Monitoring" যোগ হবে
- Route: `/dashboard/monitoring/online`
- `App.tsx`-এ route add হবে

---

### Files

| File | Change |
|------|--------|
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | **নতুন** — full page |
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | `active-sessions` action যোগ |
| `src/components/AppSidebar.tsx` | Monitoring submenu-তে item যোগ |
| `src/App.tsx` | Route যোগ |

