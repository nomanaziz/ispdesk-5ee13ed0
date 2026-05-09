## Support Ticket Section — Improvements Plan

**File:** `src/pages/dashboard/support/Tickets.tsx` (only frontend change; DB already supports it)

### 1. "Created By" column + display
- Tickets query: also join `profiles!support_tickets_created_by_fkey(full_name)` and `clients(name)` (already joined).
- Add new "Created By" column in the table after "টিকেট নং".
  - If `source === 'client'` → show client name with badge "Client"
  - Otherwise → show employee/user `full_name` with badge "Staff"
- Show same info in the Conversation dialog header.

### 2. Show all assignees (already partly done) + readability
- "Assign To" cell: if multiple, render each name as a small chip (wrap), not comma string.
- Inside Conversation dialog add an "Assigned to" section listing all assignees with assigned date.

### 3. Solve action — confirmation popup (matches uploaded screenshot)
- Replace direct `resolveMutation.mutate(t.id)` on the green check button with opening a new `<Dialog>` "Press Yes if solved".
- Dialog fields (read-only inputs prefilled from ticket/client):
  - **Connectivity Status** (Disconnected/Connected — from client's last status)
  - **Offline / Online** badge
  - **Uptime**
  - **Last Logout Time** (`format` now)
  - **MAC Address / Caller ID** (from `clients.mac_address`)
  - **IP Address** (from `clients.remote_address`)
- Footer: `Cancel` (orange) + `Yes, Solved` (dark). Only `Yes, Solved` triggers `resolveMutation`.
- Same confirmation also reachable by clicking the **Processing** status badge (per request).

### 4. Status badge colors (fix cream → proper colors)
- Replace `statusColor` shadcn variants with explicit className:
  - `pending` → yellow (`bg-yellow-500 text-white`)
  - `processing` → orange (`bg-orange-500 text-white`)
  - `solved` → **green** (`bg-green-600 text-white`) — never cream
- Make Processing badge clickable (cursor-pointer) → opens the Solve confirmation dialog.

### 5. "Solved By" tracking + display
- Already saving `solved_by` + `solved_at` in DB. Add to query: `solved_by_profile:profiles!support_tickets_solved_by_fkey(full_name)`.
- New "Solved By" column (visible only in Solved tab, or always with "—") showing name + solved time.
- Show in Conversation dialog footer when status is solved.

### 6. Assigned employee sees ticket in their portal
- This is already supported via `support_ticket_assignees`. Add a small "My Tickets" filter chip at top-right that filters list to tickets where the current `user.id` matches an `employees.user_id` of an assignee, OR `created_by = user.id`.
- (No new page; just a frontend filter on existing Tickets page.)

### Notes
- All changes are presentation/state only. No DB migration needed (`created_by`, `solved_by`, `solved_at`, `support_ticket_assignees`, `support_ticket_comments` already exist).
- Foreign-key embeds need PostgREST relationship names; if `profiles!support_tickets_created_by_fkey` does not resolve, fallback to a separate `profiles` query keyed by user IDs.
