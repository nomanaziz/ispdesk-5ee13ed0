# Employee Ticket Assignment + Solve Approval Flow

## লক্ষ্য
1. Employee (support engineer/technician) login করে শুধুমাত্র তাকে assign করা টিকিটগুলো filter করে দেখতে পারবে।
2. Employee solve করলে ticket সরাসরি "solved" না হয়ে "pending approval"-এ যাবে।
3. Admin/Manager/অন্য authorized role approval দিলে তবেই ticket "solved" হবে। চাইলে verification skip করেও approve করা যাবে।
4. Solve dialog-এ client online/offline real-time status popup দেখাবে।

## পরিবর্তন

### 1) Database (`support_tickets` table)
- নতুন column যোগ:
  - `pending_approval_at` (timestamptz) — কখন employee solve mark করেছে
  - `pending_approval_by` (uuid) — কোন employee mark করেছে
  - `approved_by` (uuid), `approved_at` (timestamptz)
  - `resolution_note` (text) — solve note
  - `client_online_at_solve` (boolean, nullable) — solve সময় online ছিল কিনা snapshot
- Status values: `processing | pending_approval | solved | rejected` (text কলামে নতুন value, enum না)

### 2) Tickets পেজ (`src/pages/dashboard/support/Tickets.tsx`)
- নতুন **"Assigned to me"** toggle/Tab — employee login হলে default ON। `support_ticket_assignees` join করে filter।
- নতুন **"Pending Approval"** tab — admin/manager দের জন্য approval queue।
- Employee দের জন্য row action: "Mark as Solved" → solve dialog খুলবে (status `processing` → `pending_approval`)।
- Admin/manager দের জন্য pending_approval row-এ "Approve" / "Reject" button → `solved` / আবার `processing`।
- Permission gate: `useEmployeeContext` দিয়ে employee হলে শুধু নিজের assigned টিকিট দেখাবে, অন্যদের জন্য সব।

### 3) Solve Dialog enhancement
- Existing dialog-এ live online/offline check যোগ — client এর MikroTik PPP active session query করে real-time status আনা (existing `clients.billing_status` + active session check)।
- Resolution note textarea।
- Submit করলে `pending_approval` status set, employee হলে।
- Admin সরাসরি solve করলে এক step এ `solved` মার্ক হবে।

### 4) My Dashboard widget (`src/pages/dashboard/me/MyDashboard.tsx`)
- "Assigned Tickets" card: open / in-progress count + recent list link → `/dashboard/support/tickets?mine=1`।

### 5) Notification (optional, scoped)
- Assignee যোগ হলে SMS/Telegram alert (existing `assignSms` flag আছে — extend)।
- Approval queue-এ নতুন entry এলে admin notification bell এ count।

## Technical Notes
- Status গুলো বর্তমানে text column — enum migration লাগবে না।
- Online detection: `mikrotik_ppp_active` বা equivalent live table থেকে client এর session lookup করে real-time popup-এ দেখাবে।
- RLS: `support_tickets` SELECT policy already tenant-scoped; employee view client-side filter দিয়ে handle হবে (যেহেতু same tenant এর সব employee দেখতে পারে — আলাদা DB rule দরকার নেই)।

## ফাইল পরিবর্তন (সংক্ষেপ)
- migration: support_tickets columns
- edit: `src/pages/dashboard/support/Tickets.tsx` (filter, tabs, approve/reject, solve flow)
- edit: `src/pages/dashboard/me/MyDashboard.tsx` (assigned widget)
- new (optional): `src/components/support/SolveTicketDialog.tsx` যদি existing inline dialog বড় হয়ে যায়
