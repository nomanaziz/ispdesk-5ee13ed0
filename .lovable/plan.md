

## Plan: MikroTik Module — Full Implementation

### Database Migration

**Alter `mikrotik_devices`:**
- Add `version` (text, default 'v3') — MikroTik API version
- Add `timeout` (integer, default 10) — API request timeout in seconds

**New table: `mikrotik_backups`** — stores backup records
- `id` (uuid PK), `mikrotik_id` (uuid FK → mikrotik_devices)
- `file_name` (text), `file_url` (text), `file_size` (bigint)
- `status` (text, default 'completed'), `created_at` (timestamptz)
- RLS enabled with authenticated access

**New table: `mikrotik_clients`** — stores imported MikroTik PPPoE/DHCP users
- `id` (uuid PK), `mikrotik_id` (uuid FK → mikrotik_devices)
- `name` (text — username), `password` (text), `service` (text — pppoe/dhcp/hotspot)
- `profile` (text — MikroTik profile name), `caller_id` (text — MAC)
- `server_name` (text), `remote_address` (text)
- `logout_time` (timestamptz), `user_status` (text — unique/duplicate/disabled)
- `branch_id` (uuid FK → branches), `exported` (boolean default false)
- `exported_to` (text — 'client_list' or 'mac_reseller')
- `status` (text, default 'active'), `created_at` (timestamptz)

**New table: `mikrotik_bulk_imports`** — tracks bulk import batches
- `id` (uuid PK), `file_name` (text), `total_rows` (integer)
- `imported_rows` (integer default 0), `package_id` (uuid FK → isp_packages)
- `status` (text — pending/processing/completed/failed)
- `created_by` (uuid FK → profiles), `created_at` (timestamptz)

### Frontend Pages

**1. Servers (`Servers.tsx`)** — matching reference screenshot
- "+ Server" button opens Add/Edit dialog with: Server IP*, Username*, Password*, API Port*, MikroTik Version (dropdown: v3/v2), API Request Timeout
- Table columns: Serial, ServerName, Server IP, Username, Password (masked with eye toggle), Port, Version, Timeout, Status (toggle switch), Action (edit/delete/sync)
- Status toggle calls Supabase update
- Search and entries-per-page selector

**2. Server Backup (`Backup.tsx`)**
- "+ Create Backup" button triggers backup creation (inserts record)
- Table: Time, Backup File Name, Download (link)
- Server selector filter at top
- Search and pagination

**3. Import From MikroTik (`Import.tsx`)** — MikroTik Client List
- **Filters row**: Servers (select), Protocol (PPPoE/DHCP/All), Profile (select from MikroTik profiles), User Type (Unique/Duplicate/All)
- Clear Filter & Apply Filter buttons
- **Action buttons**: Generate Excel, Export To MACReseller
- **Table columns**: Name, Password (masked), Service, Profile, Caller ID, Server Name, Logout Time, User Status (badge), Branch, Action (export to client list icon), Export (checkbox)
- Export action (single): clicking export icon navigates to Add Client page pre-filled with MikroTik user data (username, password, profile, server, MAC)
- Export To MACReseller (bulk): selected users get `exported_to = 'mac_reseller'` flag and transfer to MAC reseller portal
- Pagination with entries count

**4. Bulk Clients Import (`BulkImport.tsx`)**
- **Instruction toggle**: "Learn How to Import Clients..." collapsible section
- **Action buttons**: Download Sample Excel, Clear All Clients, Upload Importable Clients(Excel), Download Edited Data
- Download Sample Excel generates an XLSX with columns: C.Code, Name, Mobile, Email, NationalID, Address, Zone, Conn.Type, Server, Prot.Type, Profile, UserName, Password, R.Address, C.Type, Package, B.Status, M.Bill, Bill.Month, Join.Date, Exp.Date, DateOfBirth(Opt.), FatherName(Opt.), MotherName(Opt.), Occupation(Opt.)
- Upload parses Excel, validates data (checks package exists, profile matches MikroTik profile), shows in editable table
- Package must match for all rows in a batch OR allow per-row package assignment
- Table shows all uploaded rows with inline edit capability
- Action column: delete individual row
- "Import All" button inserts validated rows into `clients` table

### Routing
- Existing routes already defined in App.tsx — no new routes needed

### Technical Notes
- All pages use `@tanstack/react-query` + Supabase client
- MikroTik password stored encrypted in `password_encrypted` — UI shows masked dots with eye toggle
- Excel generation uses browser-side xlsx library (already available or add `xlsx` package)
- Import validation: check `isp_packages.mikrotik_profile` matches the MikroTik profile name
- Bangla UI labels throughout

