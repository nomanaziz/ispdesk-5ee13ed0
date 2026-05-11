## Plan: BW Reseller Portal Fixes

### 1. Client Support Tickets (BW reseller → Main Admin)

BW reseller is the client himself; he should NOT pick a client. Tickets go upward to main admin as bandwidth-related complaints.

**BW panel side (`/bw/panel/tickets` or `/bw/tickets`):**
- Remove "select client" UI entirely.
- New ticket form fields:
  - Issue Category (dropdown): Internet, FNANGGC, BDX, Facebook, YouTube, Speed, Other
  - Subject (text)
  - Description (textarea)
  - Priority (low/normal/high) — optional
- Reseller's name + mobile auto-attached from `bw_sale_customers` profile (no input).
- List view: only this reseller's own tickets with status (open/in-progress/resolved/closed) and admin replies.
- Replace any "fiber cutting / ONU" type categories — those belong to home-client support, not here.

**Main admin side (Support Tickets page):**
- Add tabs at top of existing Support Tickets page:
  - **Home Client** (existing tickets)
  - **Bandwidth Reseller** (new — tickets from `bw_sale_customers`)
- Bandwidth Reseller tab shows: reseller name, mobile, category, subject, status, created date; click → reply thread.
- Admin can reply, change status, close.

**Data model:**
- New table `bw_support_tickets` (reseller_id → bw_sale_customers, category, subject, description, priority, status, created_at, updated_at).
- New table `bw_support_ticket_replies` (ticket_id, sender_type 'reseller'|'admin', sender_id, message, created_at).
- RLS: reseller sees own; admin sees all.

### 2. MikroTik Add → Auto Status Check

In `BwPanelMikrotikServers.tsx` (and main `Servers.tsx` if same pattern), after successful insert:
- Immediately invoke `check-mikrotik-status` edge function with the new `device_id`.
- Update UI optimistically; show toast "Connecting…" then result.
- This removes the "unknown" stuck state on freshly added devices.

### 3. POP Add Client (BW panel) — Remove Tariff Concept

BW reseller manages own packages, not admin tariffs. In `PopAddClient` flow when invoked from BW panel context (`/bw/panel/clients/add`):
- **Remove** the yellow warning "এই POP-এ এখনো কোনো tariff assign করা হয়নি".
- **Hide** tariff dropdown entirely.
- Package selection comes from reseller's own MikroTik profiles / packages, not from admin tariffs.
- Detection: check `usePopScope` / route prefix `/bw/panel/*` to branch the form behavior.

### Technical Details

**Files to add:**
- `supabase/migrations/*` — `bw_support_tickets`, `bw_support_ticket_replies` + RLS
- `src/pages/bw-panel/BwPanelTickets.tsx` — new ticket UI for reseller
- `src/pages/dashboard/support/AdminBwTicketsTab.tsx` — admin tab content

**Files to edit:**
- Main Support Tickets admin page → add Tabs wrapper (Home Client / Bandwidth Reseller)
- `BwPanelMikrotikServers.tsx` → call `check-mikrotik-status` on insert success
- `PopAddClient.tsx` (or shared `AddClient.tsx`) → conditionally hide tariff section + warning when `isBwPanelContext`
- Sidebar (`BwCustomerLayout`) → ensure "Support Tickets" menu points to new BW reseller tickets page

**No changes needed to:** main admin client tickets logic, edge function `check-mikrotik-status` itself.

### Validation
- Reseller creates ticket → admin sees it in Bandwidth Reseller tab → admin replies → reseller sees reply.
- Add new MikroTik → status flips from "unknown" → "online/offline" within seconds.
- `/bw/panel/clients/add` → no tariff warning, no tariff dropdown visible.