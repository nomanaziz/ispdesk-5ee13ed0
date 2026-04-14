

## Plan: SMS Module — Full Implementation

### Overview
Implement all 5 SMS pages with full CRUD UI and Supabase integration. The module allows sending SMS to individual numbers, client groups (paid/unpaid/due), and bulk send via configurable SMS gateways with ID/password/API authentication.

### Database Changes (Migration Required)
Enhance existing tables to support the full workflow:

**`sms_gateways`** — add fields:
- `username` (text) — gateway login ID
- `password` (text) — gateway password
- `sms_type` (text, default 'english') — english/bangla support
- `is_default` (boolean, default false)

**`sms_log`** — add fields:
- `sms_type` (text) — recipient category: individual, paid_clients, unpaid_clients, due_clients, all_clients
- `template_id` (uuid, FK to sms_templates)
- `group_id` (uuid, FK to sms_groups)
- `sent_by` (uuid, FK to auth.users)
- `recipient_count` (integer, default 1)

**`sms_groups`** — add fields:
- `members` (jsonb) — array of phone numbers or client references
- `group_type` (text) — manual / auto (paid/unpaid/due)

**`sms_templates`** — add field:
- `variables` (text) — placeholder variables like {name}, {bill}, {due_date}

### Pages to Implement

**1. SMS Gateway (`Gateway.tsx`)** — এসএমএস গেটওয়ে
- "+ Add Gateway" dialog: Name, API URL, API Key, Username (ID), Password, Sender ID, SMS Type (English/Bangla), Default toggle, Status
- Table: Serial, Name, API URL, Sender ID, Type (English/Bangla badge), Default (star icon), Status, Actions
- Multiple gateways supported

**2. SMS Templates (`Templates.tsx`)** — এসএমএস টেমপ্লেট
- "+ Add Template" dialog: Name, Content (textarea with variable hints), Type (bill_reminder/welcome/custom), Status
- Variable hints: {name}, {client_id}, {bill}, {due_date}, {package}
- Table: Serial, Name, Content preview, Type, Status, Actions

**3. SMS Groups (`Groups.tsx`)** — এসএমএস গ্রুপ
- "+ Add Group" dialog: Name, Group Type (manual/auto), Description, Status
- Auto groups: Paid Clients, Unpaid Clients, Due Clients (auto-populated from clients table)
- Manual groups: add phone numbers manually
- Table: Serial, Name, Type, Member Count, Status, Actions

**4. Individual SMS (`Individual.tsx`)** — ইন্ডিভিজুয়াল এসএমএস
- Send to specific number or search client
- Form: Recipient Number (manual or client search), Gateway (select), Template (optional select), Message (textarea)
- Client quick-select tabs: Paid, Unpaid, Due, All — loads client list with checkboxes
- Preview message before send
- Insert into `sms_log` on send

**5. Send SMS (`Send.tsx`)** — এসএমএস পাঠান (Bulk)
- Bulk send to groups or filtered clients
- Form: Target (Group select / Client filter: paid/unpaid/due/all), Gateway (select), Template (select or custom), Message
- Summary: recipient count preview
- Table below: Recent SMS log with status, recipient count, date

### Technical Details
- All CRUD via `@tanstack/react-query` + Supabase
- Gateway selection shared across Individual and Send pages
- Client filtering queries `clients` table by `status` field (active=paid, expired/due=unpaid)
- SMS sending is UI-only (inserts to `sms_log`) — actual API integration to gateway is future scope
- Bangla UI labels throughout

### Files to Edit (5)
- `src/pages/dashboard/sms/Gateway.tsx`
- `src/pages/dashboard/sms/Templates.tsx`
- `src/pages/dashboard/sms/Groups.tsx`
- `src/pages/dashboard/sms/Individual.tsx`
- `src/pages/dashboard/sms/Send.tsx`

