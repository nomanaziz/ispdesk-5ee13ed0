

## Plan: OLT Management Module — Full Page Implementation

### Overview
Implement all 6 OLT management pages (currently placeholders) with full UI and Supabase data integration. No database changes needed — all tables (`olt_devices`, `onu_list`, `onu_history`, `alerts`, `olt_branch_shares`, `clients`) already exist.

### Pages to Implement

**1. OLT Devices (`OltDevices.tsx`)** — OLT ডিভাইস ম্যানেজমেন্ট
- "+ Add OLT" dialog: Name, Vendor (enum dropdown: huawei/bdcom/vsol/dbc/syrotech/solitine/corelink/c-data/ecom/hsgq/phyhome), IP Address, Port, Connection Type (telnet/ssh), Username, Password, Branch (select), MikroTik Link (optional select), Description
- Summary cards: Total OLT, Online, Offline, Total ONU
- Table: Serial, Name, Vendor (badge), IP:Port, Connection, Branch, Status (online/offline badge), CPU%, Memory%, Uptime, Total ONU, Online ONU, Actions (edit/delete/view)
- View action navigates to ONU list filtered by that OLT
- Status toggle switch per device

**2. ONU List (`OnuList.tsx`)** — সকল ONU তালিকা
- Filters: OLT (select), Status (online/offline/all), dB Range (dropdown buckets), Search (MAC/serial/description)
- Summary cards: Total ONU, Online, Offline, High dB (>-24)
- Table: Serial, OLT Name, Interface, MAC, Serial Number, Description, Status (badge), RX Power (color-coded dBm), TX Power, Distance (m), Last Seen, Offline Reason, Actions (view history)
- dB values color-coded: green (<-18), yellow (-18 to -24), orange (-24 to -27), red (>-27)
- Pagination

**3. OLT Users (`OltUsers.tsx`)** — OLT ইউজার ম্যাপিং
- Shows clients mapped to ONUs (via `clients.onu_id`)
- Filters: OLT (select), Zone, Status, Search (client name/username/MAC)
- Table: Serial, Client ID, Username, Name, Contact, Zone, ONU MAC, ONU Interface, RX Power, ONU Status, Client Status, Actions (view client profile)
- Join: `clients` → `onu_list` → `olt_devices`
- Unmapped ONU indicator for ONUs without a linked client

**4. User Down Count (`UserDownCount.tsx`)** — ডাউন ONU কাউন্ট
- Summary: Total Down ONUs, grouped by OLT
- Filters: OLT (select), Date range
- Table grouped by OLT: OLT Name, Total ONU, Online, Offline, Offline %, list of offline ONUs with MAC/description/last_seen/offline_reason
- Bar chart or visual showing offline percentage per OLT
- Auto-refresh toggle

**5. Fiber Down Finder (`FiberDownFinder.tsx`)** — ফাইবার ডাউন সনাক্তকরণ
- Purpose: Find clusters of offline ONUs on the same interface/port (indicates fiber cut)
- Groups offline ONUs by OLT + interface prefix (e.g., `0/1/1` → all ONUs on that PON port)
- Table: OLT Name, PON Port/Interface, Total ONU on Port, Offline Count, Offline %, Status (Fiber Down if >50% offline, Warning if >30%), Last Change
- Expandable rows showing individual offline ONUs on that port
- Alert badges for likely fiber cuts

**6. OLT Sharing (`OltSharing.tsx`)** — ব্রাঞ্চ অনুযায়ী OLT শেয়ারিং
- Uses existing `olt_branch_shares` table
- "+ Share OLT" dialog: Select OLT, Select Branch
- Table: Serial, OLT Name, OLT IP, Shared With Branch, Shared By (profile name), Shared Date, Actions (remove share)
- Filter by OLT or Branch

### Technical Details
- All queries via `@tanstack/react-query` + Supabase client
- ONU list joins: `onu_list` → `olt_devices` for OLT name
- OLT Users joins: `clients` (where `onu_id` is not null) → `onu_list` → `olt_devices`
- Fiber Down: client-side grouping of offline ONUs by `interface` prefix
- dB color coding reuses the bucket logic from `OltOverview.tsx`
- Bangla UI labels throughout
- No new database tables or migrations needed

