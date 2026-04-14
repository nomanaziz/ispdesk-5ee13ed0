

## Plan: Task Management Module — Internal Organization Tasks

### Overview
Implement the 3 task management pages for internal organizational use. The existing `tasks` and `task_categories` tables cover the basics but need enhancements for multi-assignee support, created_by tracking, and task comments/notes.

### Database Migration

**Alter `tasks`** — add missing workflow fields:
- `created_by` (uuid, nullable) — who created the task
- `remarks` (text, nullable) — additional notes
- `attachments` (text[], nullable) — file URLs

**New table: `task_assignees`** — many-to-many for multi-assign (like support tickets)
- `id` (uuid PK), `task_id` (uuid FK → tasks ON DELETE CASCADE)
- `employee_id` (uuid FK → employees ON DELETE CASCADE)
- `assigned_at` (timestamptz, default now())
- Unique constraint on (task_id, employee_id)
- RLS enabled, authenticated users can manage

**New table: `task_comments`** — discussion thread per task
- `id` (uuid PK), `task_id` (uuid FK → tasks ON DELETE CASCADE)
- `user_id` (uuid, not null) — who commented
- `comment` (text, not null)
- `created_at` (timestamptz, default now())
- RLS enabled

### Frontend Pages

**1. Task Categories (`TaskCategories.tsx`)**
- "+ Add Category" dialog: Name, Status (active/inactive)
- Table: Serial, Category Name, Status (badge), Created Date, Actions (edit/delete)
- Search filter

**2. Tasks (`Tasks.tsx`)**
- Summary cards: Total Tasks, Pending, In Progress, Completed
- "+ New Task" dialog: Title, Description, Category (select), Priority (High/Medium/Low), Due Date, Assign To (multi-select employees), Remarks
- Filters: Category, Priority, Status, Assigned To, Date Range
- Table: Serial, Title, Category, Priority (colored badge), Due Date, Assigned To (avatar chips), Status (badge: pending/in_progress/completed/cancelled), Created By, Created Date, Actions (edit/view conversation/delete/mark complete)
- Status update dropdown per task row
- Conversation dialog (same pattern as support tickets): comment thread with author and timestamp

**3. Task History (`TaskHistory.tsx`)**
- Shows only completed/cancelled tasks
- Summary cards: Total Completed, Total Cancelled, Avg Completion Time
- Filters: Category, Date Range, Completed By
- Table: Serial, Title, Category, Priority, Assigned To, Created Date, Completed Date, Duration, Status, Actions (view details)
- CSV export button

### Technical Details
- All queries via `@tanstack/react-query` + Supabase
- Multi-assign uses `task_assignees` join table (same pattern as `support_ticket_assignees`)
- Employee names fetched from `employees` table for assignment dropdowns
- Duration: `completed_at - created_at` displayed as `Xd:Xh:Xm`
- Bangla UI labels throughout
- 3 files to create/edit, 1 migration

