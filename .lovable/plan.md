

## Plan: Events & Holidays Page

### Overview
Implement the Events & Holidays page using the existing `events_holidays` table. This page will be visible to all employees for viewing company events and holidays, with admin CRUD capabilities.

### Existing Table Schema (`events_holidays`)
- `id` (uuid, PK), `title` (text), `description` (text, nullable), `event_date` (date), `end_date` (date, nullable), `type` (text, default 'holiday'), `status` (text, default 'active'), `created_at` (timestamptz)

No database migration needed.

### Implementation

**Events Page (`src/pages/dashboard/events/Events.tsx`)**
- Header: "ইভেন্ট ও ছুটি" with "+ নতুন ইভেন্ট" button
- Calendar view (mini calendar) highlighting event dates at the top
- Filter tabs: All / Holiday (ছুটি) / Event (ইভেন্ট) / Meeting (মিটিং)
- Table: Serial, Title, Date, End Date, Type (badge: holiday/event/meeting), Status, Actions (edit/delete)
- Add/Edit dialog: Title, Description, Event Date, End Date, Type (select: holiday/event/meeting), Status toggle
- Upcoming events card showing next 5 events sorted by date
- Bangla UI labels throughout

### Files to Edit (1)
- `src/pages/dashboard/events/Events.tsx`

