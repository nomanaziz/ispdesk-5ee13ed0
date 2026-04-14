

## Plan: VAS (OTT Platform) Module — Full Implementation

### Overview
Implement the VAS Config page to manage OTT platform subscriptions (Bongo, Chorki, Ayna, etc.) and allow admins to send VAS credentials (ID/Password) to individual clients or groups of clients via SMS.

### Database Changes (Migration Required)

**Alter `vas_services` table** — add fields for OTT credentials and branding:
- `logo_url` (text) — platform logo
- `provider_type` (text, default 'ott') — e.g. ott, iptv
- `credentials_template` (text) — SMS template for sending credentials

**Create `vas_subscriptions` table** — track which client has which VAS with credentials:
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients)
- `service_id` (uuid, FK → vas_services)
- `vas_username` (text) — OTT login ID
- `vas_password` (text) — OTT password
- `start_date` (date)
- `end_date` (date)
- `status` (text, default 'active')
- `created_at` (timestamptz)

Pre-seed popular BD OTT platforms: Bongo, Chorki, Ayna, Hoichoi, Toffee, Bioscope

### Implementation

**1. VAS Config (`VasConfig.tsx`)**
- CRUD table for OTT services: Name, Price, Status (active/inactive), Description
- Pre-populated with popular BD platforms
- Toggle active/inactive status
- Add/Edit dialog

**2. VAS Subscriptions section (within VasConfig or separate tab)**
- Assign VAS credentials to a client: select client → select service → enter username/password → set dates
- Table showing all active subscriptions with client name, service, credentials, expiry
- Edit/Revoke subscription

**3. Send Credentials feature**
- "Send Credentials" button on each subscription row
- Bulk send dialog: filter by VAS service → select clients/groups → sends SMS with ID/password
- Uses existing `sms_log` table and SMS gateway infrastructure
- Message template auto-filled: "আপনার {service_name} ID: {username}, Password: {password}"

**4. VAS Transactions (`VasTransactions.tsx`)**
- Show transaction history from `vas_transactions` table with client and service names

**5. Sidebar update** — Bangla labels: "VAS কনফিগ", "সাবস্ক্রিপশন", "লেনদেন"

### Files to Edit (3)
- `src/pages/dashboard/vas/VasConfig.tsx`
- `src/pages/dashboard/vas/VasTransactions.tsx`
- `src/components/AppSidebar.tsx`

