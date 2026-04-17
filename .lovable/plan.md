

## Portal Manager — Full Rebuild

### Current state
- `src/pages/dashboard/clients/PortalManage.tsx` — likely placeholder/incomplete
- Client portal pages already built: Dashboard, Notices, Media Servers, Company Info, Invoices, Support
- DB has: `clients` (with username/password), `client_notices`, `media_servers`, `system_settings`

### লক্ষ্য (User-এর চাওয়া)
1. **Portal Manager** admin-side পুরাপুরি কাজ করবে
2. কোনো আলাদা "Registration" নেই — by default সব client login করতে পারবে
3. **Default credentials**: username = `client_id` (client code), password = primary mobile number বা PPPoE secret password (admin choose করবে)
4. **Registered Clients tab**: সব client list, search, filter, app-user vs non-app-user toggle, login/logout log দেখা
5. **Login History**: কে কখন কোন IP থেকে login/logout করেছে — last 5-6 months
6. **Notices**, **Media Servers**, **News & Events**, **Speed Test Server**, **Company Info** — সব এখান থেকে manage হবে → client portal-এ instantly দেখাবে

### Layout (image-অনুসরণে)

Left sub-menu (within Portal Manage page):
- 📢 **Notices** — admin notices CRUD (already in `client_notices` table)
- 🎬 **Media Servers** — Live TV/FTP servers CRUD (already in `media_servers` table) + Server Categories tab
- 📰 **News & Events** — news items CRUD (নতুন table দরকার)
- 🚀 **Speed Test Server** — demo/custom URL setting (system_settings-এ)
- 👥 **Registered Clients** — সব client list + login log + bulk default password reset

Top stats cards on Registered Clients tab:
- Total Registered Clients
- App Users (যারা last 30 দিনে login করেছে)
- Non-App Users

### Default credential strategy

Admin-এর জন্য একটা **Settings panel** Portal Manage-এর top-এ:
- "Default Password Source" radio: **Mobile Number** | **PPPoE Password** | **Custom Static**
- Bulk action button: "Reset all to default" (re-applies above rule to all clients)
- Per-client action: "Reset password to default" + "Show credentials" (modal)

`clients.username` যদি null হয় → auto-set to `client_id`
`clients.password` যদি null হয় → auto-set to mobile/PPPoE per setting

### Login history tracking

**নতুন table:**
```
portal_login_log (
  id, client_id, username, login_at, logout_at,
  ip_address, user_agent, session_id, status (active/ended), created_at
)
```
- `portal-auth` edge function-এ login successful হলে একটা row insert হবে (IP from `x-forwarded-for`, UA from headers)
- Logout button → row update with `logout_at`
- Auto-cleanup cron: 6 মাসের পুরনো record delete (manual SQL or pg_cron later)

**Registered Clients table-এ extra columns:**
- "Last Login" timestamp
- "Status" pill: Online (last login < 30 min, no logout) / Offline
- Action menu: View Login History (modal showing last 50 sessions), Reset Password, Disable Portal

### News & Events (নতুন)

**নতুন table:**
```
client_news_events (
  id, title, details, photo_url, type (news/event),
  event_date, active, created_by, created_at, updated_at
)
```
RLS: Public read, admin write — same pattern as `client_notices`.

Client portal `PortalNotices` page-এ একটা "News & Events" tab add হবে অথবা আলাদা page।

### Speed Test Server

`system_settings`-এ ২টা key add:
- `speed_test_mode`: 'demo' | 'custom'
- `speed_test_url`: text

Client portal-এ একটা নতুন `PortalSpeedTest` page → iframe বা link out।

### Files

| File | Action |
|------|--------|
| migration | `portal_login_log`, `client_news_events` tables + RLS + system_settings keys |
| migration | Backfill `clients.username` = `client_id`, `clients.password` = `contact` (mobile) where null |
| `supabase/functions/portal-auth/index.ts` | Edit — insert login_log row, capture IP/UA |
| `src/pages/dashboard/clients/PortalManage.tsx` | Full rebuild — tabbed layout (Notices/Media/News/SpeedTest/Registered Clients) |
| `src/components/portal-manage/NoticesTab.tsx` | নতুন — CRUD |
| `src/components/portal-manage/MediaServersTab.tsx` | নতুন — CRUD + Categories sub-tab |
| `src/components/portal-manage/NewsEventsTab.tsx` | নতুন — CRUD |
| `src/components/portal-manage/SpeedTestTab.tsx` | নতুন — settings form |
| `src/components/portal-manage/RegisteredClientsTab.tsx` | নতুন — table + stats + filters |
| `src/components/portal-manage/LoginHistoryDialog.tsx` | নতুন — per-client log viewer |
| `src/components/portal-manage/DefaultPasswordSettings.tsx` | নতুন — global password rule + bulk reset |
| `src/components/portal-manage/CredentialDialog.tsx` | নতুন — show/copy username + password |
| `src/pages/portal/PortalNotices.tsx` | Add News tab tab |
| `src/pages/portal/PortalSpeedTest.tsx` | নতুন (linked from portal sidebar) |
| `src/components/PortalLayout.tsx` | Add "Speed Test" menu item |

### Phasing

- **Phase 1 (এখন):** All tables/migration, Portal Manage rebuild with all 5 tabs, default credential auto-assign, login log tracking via edge function update, Registered Clients table with login history modal, password reset, News/Events CRUD, Speed Test settings, client portal sidebar update
- **Phase 2 (পরে):** Old log auto-cleanup cron (pg_cron), real-time online status (instead of <30min heuristic)

