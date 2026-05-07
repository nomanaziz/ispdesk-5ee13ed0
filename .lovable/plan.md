## Add Reference-Style Dashboard Widgets

The reference image has a very specific 4-column layout. I'll match its pattern using existing tokens (no new colors).

### Layout

```
Row 1 — POP hero (4 tiles, full width):
[Total POP] [Total POP Clients] [Enabled POP Clients] [Disabled POP Clients]

Row 2 — 4 columns:
[Zone Wise Donut]  [Sub-Zone Donut]  [Ticket+Task tile column]  [Monthly Problem Donut]

Row 3 — 2 columns:
[Most Problem Solver — horizontal bar]   [Monthly New Clients — bar (existing)]
```

This row replaces the current right-rail "সাপোর্ট/অপারেশন" InfoList and the standalone "টপ অ্যাক্টিভ ব্যবহারকারী" card moves below the new rows. Hero KPI row + System Overview + Action Required + Finance + 12-month trend + বকেয়া list stay where they are.

### Components

**POP hero tiles (`PopHeroCard`)** — 4 tiles using existing `MetricTile`-style colors (sky / teal / violet / slate via `bg-primary`, `bg-emerald-500/10`, etc.). Values:
- Total POP = `branch_managers` count
- Total POP Clients = clients with `branch_id IS NOT NULL` (already as `popTotalClients`)
- Enabled = `popTotalClients - mikrotik_status='disabled' (POP)`
- Disabled = `mikrotik_status='disabled'` among POP clients

**Zone donut** — recharts `PieChart` of open tickets grouped by `zone_id` (resolved to zone name). Shows top 8 + percentage labels, side legend (matches reference).

**Sub-Zone donut** — same as above but `subzone` text column.

**Ticket+Task column** — 4 stacked colored tiles: Pending Tickets, Processing Tickets, Pending Task, Processing Task (data already in `d`). Each row clickable.

**Monthly Problem Occurrence donut** — group `support_tickets` by `subject` (or `category_id` if any) for current month, top 10 categories.

**Most Problem Solver (horizontal bar)** — `support_tickets.solved_by` joined to `employees.name`, current month, top 12, recharts `BarChart layout="vertical"`.

### New queries to add inside the existing `Promise.all`

- `clients` count: `branch_id NOT NULL AND mikrotik_status != 'disabled'` → enabled POP clients
- `clients` count: `branch_id NOT NULL AND mikrotik_status = 'disabled'` → disabled POP clients
- `support_tickets.subject` rows for current month → category aggregation
- `support_tickets.solved_by` rows for current month → solver aggregation
- `employees(id, name)` → name lookup

### Color palette (donuts/bars)
Use a fixed 12-color HSL array tied to tokens-like hues (the existing `PIE_COLORS` constant is already defined at the top of the file). Reuse it.

### Files
- edit `src/pages/Dashboard.tsx` (add queries + rebuild middle section JSX)

No DB changes, no new routes, no new files.
