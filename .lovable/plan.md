## Support Ticket — Realtime Assign + Department Filter + Start Working

### 1. Fix "Assign করলে দেখা যায় না" (Realtime + Cache)

**Problem:** assignMutation invalidates `["ticket_assignees", "support_tickets"]` as a single key (wrong shape) → list never refreshes; even reload sometimes shows stale data because the assignees query has key `["ticket_assignees"]` (no ticket_id).

**Fix in `src/pages/dashboard/support/Tickets.tsx`:**
- Replace single invalidate with two calls:
  ```ts
  qc.invalidateQueries({ queryKey: ["ticket_assignees"] });
  qc.invalidateQueries({ queryKey: ["support_tickets"] });
  ```
- Add Supabase **Realtime subscription** in a `useEffect` for tables `support_tickets` and `support_ticket_assignees` → on any change invalidate both queries. UI will live-update without reload.
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets, support_ticket_assignees;` (and `REPLICA IDENTITY FULL`).

### 2. Redesign Assign Dialog → "Assign Solvers" (matches uploaded screenshot)

Replace current checkbox list with:
- **Title:** "Assign Solvers"
- **DEPARTMENT** dropdown — fetches from `departments` table (active, branch-scoped). Selecting a department filters the employee list.
- **EMPLOYEE** multi-select with searchable input + chip tags (using existing `Command`/`Popover` pattern or a simple search input + tag chips). Shows only employees whose `department_id` matches the selected department; if no department picked, search across all employees.
- **SMS checkbox** (sends SMS notification — wired to existing SMS infra if present, otherwise a no-op flag stored on the ticket — confirm with user before wiring SMS gateway).
- Footer: red **No** + green **Yes** buttons.
- On Yes: insert assignees, set ticket `status = 'processing'`, set new `processing_started_at = now()`. Realtime + invalidate updates the table instantly; chips appear under "Assign To" column.

### 3. Time Tracking — auto-start on Processing

**Migration** (new columns on `support_tickets`):
- `processing_started_at timestamptz` — set when ticket moves to processing
- `work_started_at timestamptz` — set when assigned employee clicks "Start Working"
- `work_started_by uuid` — which employee started

**Display:**
- New "Time Elapsed" indicator in the Status cell (when `processing`): live ticking `Hh:Mm:Ss` since `processing_started_at` (client-side `setInterval`, no extra fetch).
- When solved, show total `solved_at - processing_started_at` (replaces current Duration calc which uses `created_at`).

### 4. Employee "Start Working" workflow

- The "My Tickets" filter (already added) lets the logged-in employee see their tickets.
- For each ticket assigned to them where `work_started_by IS NULL`:
  - Show a **Start Working** button (blue) in the action column.
  - Click → updates `work_started_at = now()`, `work_started_by = employees.id` (resolved from `employees.user_id = auth.uid()`).
  - Button changes to a live "Working: 00:12:34" badge.
- After Start Working, the existing "Solve" confirmation dialog remains; on Yes, sets `solved_at`, `solved_by`, status `solved`.

### 5. Files touched

- **Migration** (new): add columns + enable realtime publication + replica identity.
- **`src/pages/dashboard/support/Tickets.tsx`**:
  - Realtime hook
  - Department-filtered Assign Solvers dialog (new design)
  - Time-elapsed live counter component
  - Start Working button + mutation
  - Fix invalidate keys

### Open question (will ask before building)

The screenshot shows an "SMS" checkbox. Should clicking Yes actually send SMS to assignees via your existing SMS gateway (if one is configured), or just store the flag for now? I'll ask via questions tool before implementing that part.
