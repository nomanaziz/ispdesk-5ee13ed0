

## Plan: Support & Ticketing Module — Full Implementation

### Database Migration

**Alter `support_categories`** — add fields matching the reference screenshot:
- `department` (text, nullable) — e.g., Transmission, NOC
- `category_type` (text, default 'for_everyone') — "Only For Office" or "For Everyone"
- `details` (text, nullable)

**Alter `support_tickets`** — add fields for the full ticket workflow:
- `complain_no` (text, nullable) — complained number/phone
- `created_by` (uuid FK → profiles, nullable) — who opened the ticket
- `solved_at` (timestamptz, nullable)
- `solved_by` (uuid FK → profiles, nullable)
- `source` (text, default 'admin') — 'admin' or 'client_portal'
- `zone_id` (uuid FK → zones, nullable)
- `subzone` (text, nullable)
- `box` (text, nullable)
- `attachments` (text[], nullable) — file URLs

**New table: `support_ticket_assignees`** — many-to-many for multi-assign
- `id` (uuid PK), `ticket_id` (uuid FK → support_tickets ON DELETE CASCADE)
- `employee_id` (uuid FK → employees ON DELETE CASCADE)
- `assigned_at` (timestamptz, default now())
- Unique constraint on (ticket_id, employee_id)
- RLS enabled

**New table: `support_ticket_comments`** — ticket conversation/discussion thread
- `id` (uuid PK), `ticket_id` (uuid FK → support_tickets ON DELETE CASCADE)
- `user_id` (uuid FK → profiles)
- `comment` (text NOT NULL) — rich text content
- `attachments` (text[], nullable)
- `created_at` (timestamptz, default now())
- RLS enabled

### Frontend Pages

**1. Support Categories (`SupportCategories.tsx`)**
- Tabs: Client's, POP's, Bandwidth POP's (matching reference)
- "+ Support Category" dialog: Name, Department (select from `departments`), Category Type (Only For Office / For Everyone), Details
- Table: Serial, Support Category, Department, Category Type (colored badge), Details, Action (edit/delete)
- Search + pagination

**2. Client Support / Tickets (`Tickets.tsx`)**
- Tabs: Accepted (Client's), Pending (Client's) with count, MAC Reseller's, Bandwidth POP's
- Summary cards: Total Tickets (current month), Pending Tickets, Processing Tickets, Solved Tickets
- Filters: Support Category, Zone, Solved By/Assign To, Created By, Status, Priority, From Date, To Date, Complained No
- Table: TicketNo, ClientCode, ID/IP, CustomerName, Mobile, ComplainNo, Zone, Subzone, Box, Problem, Priority (badge), Complain Time, CreatedBy, Status (badge), Assign To (button), Solved Time, Duration
- Assign button opens multi-select employee dialog
- Row actions: conversation (chat icon), edit, delete
- "+ Open New Ticket" button opens full ticket creation dialog

**3. New Ticket Dialog (within Tickets page)**
- Client search by Username/ID — auto-fills: Customer Name, Mobile, Address, Zone, Billing Status, Monthly Bill, Last Paid, Payment Status, MikroTik Status, Uptime, Last Logout, MAC/Caller ID, IP Address, Device Vendor, Connectivity Status
- ONU Information section (auto-filled from OLT data): MAC, IP, OLT Name, Optical Power, OLT Port, ONU MAC/Serial, Status, Last Deregister, Distance, Deregister Reason, Description
- Form fields: Problem Category (select), Problem Priority (select: High/Medium/Low), Complained Number, Attachments, Remarks/Note (textarea)
- "Send SMS to Client?" checkbox
- Cancel / Clear / Submit buttons

**4. Ticket Conversation Dialog**
- Rich text editor for new comment
- Attach images option
- "Submit Your Comments" button
- Previous Discussion: chronological list of comments with author avatar, name, date, and content
- Footer: Cancel, View Details, Refresh buttons

**5. Support History (`History.tsx`)**
- Tabs: Client's, POP's, Bandwidth POP's
- Action buttons: Generate PDF, Generate CSV
- Summary cards: Total Tickets, From Client Portal, From Admin Portal, Ticket's Priority (H:xx M:xx L:xx)
- Filters: From Date, To Date, Solved By, Problem Category, Zone
- Table: Sr.No, Date, TicketNo, ClientCode, Username, MobileNo, Zone, Category, Solve Time, Solved By (multiple names), Duration, Ticketing Info (icon)
- Only shows resolved/solved tickets

### Routing
- No new routes needed — existing routes `/dashboard/support/categories`, `/dashboard/support/tickets`, `/dashboard/support/history` already in App.tsx

### Technical Details
- Multi-assign: `support_ticket_assignees` join table; Tickets page shows "Assign" button that opens a multi-select dropdown of employees
- Duration calculation: `solved_at - created_at` displayed as `Xd:Xh:Xm:Xs`
- Conversation: `support_ticket_comments` displayed in chronological order within a dialog
- Ticket numbering: auto-increment counter or max(ticket_no)+1
- All queries via `@tanstack/react-query` + Supabase
- Bangla UI labels throughout

