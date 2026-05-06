## Goal

Make every page in the app look like it came from the same designer:
- One table style everywhere (dark header + zebra rows + same border/radius)
- One button size system (no random `h-8`, `h-9`, `h-10`, `h-11` mixed)
- One page header pattern (title + description + action area)
- One filter card pattern
- No more random violet/blue/black/rounded variations

No data, schema, or routes change — only UI components and class cleanup.

---

## What will change

### 1. Single table style — `src/components/ui/table.tsx`
Already has `--table-head` (dark slate) + `--table-row-alt` zebra. But many pages bypass it by adding `bg-primary` / `bg-blue-*` / custom header rows. The `<TableRow>` inside `<TableHeader>` will be forced to **inherit** the dark head color (no overrides). I'll:
- Remove the custom `bg-primary` header row in `ReportLayout.tsx` so it uses the global dark head (matches screenshot 2).
- Add a small CSS rule: `thead tr { background: transparent !important }` so any `bg-primary`/`bg-blue` accidentally set by pages is neutralized.
- Tables always wrapped: `border rounded-lg overflow-hidden` (one radius — `rounded-lg`, never `rounded-2xl`/`rounded-xl`).

### 2. Single button size system — `src/components/ui/button.tsx`
Current sizes: `default h-10`, `sm h-9`, `lg h-11`, `icon h-10`. The codebase mixes them randomly (toolbars use `h-8`, `h-9`, `h-10` side-by-side).

Standardize to **3 sizes only**, used consistently:
- `default` → `h-9 px-4` (primary action — "Add", "Save", "Apply")
- `sm` → `h-8 px-3 text-xs` (toolbar / table-row actions)
- `icon` → `h-9 w-9` (icon-only)
- `lg` kept but unused in CRUD pages.

All `<Input>` and `<Select>` triggers will also default to `h-9` so toolbars line up with buttons (already the shadcn default — verify and fix the few places that set `h-8`/`h-10` inline).

### 3. Single page header — `src/components/common/PageHeader.tsx`
Drop the Icons8 dependency (faster, removes inconsistent illustrations). New header = lucide icon chip + title + description + right-aligned actions, identical on every page. Pages currently rolling their own header (e.g. `PopActivityLog`, `PopBillPeriod`, `PopProcessingFee`, `PopPaymentGateways`, `PopPeriodSetup`) will switch to `<PageHeader>`.

### 4. Single CRUD page shell — `src/components/config/ConfigCrudPage.tsx`
Currently uses `<Card>`+`<CardHeader>`+custom search bar. Refactor to:
- Use `<PageHeader>` at top (title + "+ নতুন যোগ করুন" action).
- Toolbar row (search + bulk actions) using the standardized `h-9` controls.
- Table block: `border rounded-lg overflow-hidden`, no inner card padding.
- Action column: only `<Button size="icon" variant="ghost" className="h-8 w-8">` — same everywhere (Edit + Delete).

This component is used by ~30 config pages, so fixing it propagates instantly.

### 5. Single report shell — `src/components/reports/ReportLayout.tsx`
- Filter banner: change from violet `bg-primary` strip to the same dark slate as table head (`bg-[hsl(var(--table-head))]`) — one tone everywhere (matches screenshot 1's request).
- Remove the custom `<TableRow className="bg-primary hover:bg-primary">` — let the global dark `<TableHeader>` style win.
- Export buttons (PDF/CSV/Excel) use `size="sm"` — already correct.
- Pagination buttons use `size="sm"` — already correct.

### 6. Class cleanups (sweep)
A targeted ripgrep + edit pass through `src/pages/**` and `src/components/**` to remove these inconsistencies:
- `bg-primary`, `bg-blue-*`, `bg-slate-900` applied to `<TableHeader>`/`<TableRow>` inside thead → removed.
- `rounded-2xl`, `rounded-xl` on table/card containers → `rounded-lg`.
- Random `h-8`/`h-10`/`h-11` on Buttons → `size="sm"` or default.
- Inline `text-blue-600`, `text-purple-600` on table headers → removed (inherits white).

Targeted files (highest impact, from rg results):
`Dashboard.tsx`, `ResellerTickets`, `ResellerInvoices`, `ResellerInvoiceDetail`, `ResellerMikrotikUsers`, `ResellerUsers`, `PopOnlineMonitoring`, `PopActivityLog`, `PopBillPeriod`, `PopPaymentGateways`, `PopPeriodSetup`, `PopProcessingFee`, `PopAutomaticProcess`, `PopSmsTemplates`, `PopSmsGateway`, `PopSmsIndividual`, `PopBulkClientImport`, `PopIncome`, `PopExpense`, `PopCashBook`, `PopPackages`, `PopAllotedAreas`, `BwPanelMikrotikServers`, `BwPurchaseOrders`, `dashboard/support/*`, `dashboard/website/*`, `dashboard/hr/*`, `dashboard/sms/*`, `dashboard/purchases/*`, `dashboard/accounting/*`, `dashboard/system/*`, `dashboard/clients/*`, `dashboard/assets/*`, `dashboard/access/*`, `dashboard/reports/*`, `BwInvoiceDetailDialog`, `PgwFundDialog`.

### 7. Files NOT touched
- Database, RLS, edge functions, routes, business logic — none.
- Mobile shell (`src/components/mobile/*`) — has its own design system on purpose.
- Public marketing site (`src/pages/public/*`) — separate visual language.

---

## Acceptance criteria

After approval the user should see:
- Every table on `/dashboard/...`, `/pop-admin/...`, `/portal/...`, `/bw/...` admin pages has the same dark head, same zebra rows, same border, same `rounded-lg` corners.
- Every "Add / Save / Apply / Cancel" button is the same height (h-9). Every toolbar icon button is h-8 w-8.
- Every page header looks identical: lucide icon chip + bold title + muted description + right-side actions.
- Filter banner color matches table head color (no more violet strip + dark head mismatch).
- No page uses `rounded-2xl` or `bg-primary` on a table.

Total files touched: ~50 (mostly small className edits). Two component files (`table.tsx`, `button.tsx`) and three layout files (`PageHeader.tsx`, `ConfigCrudPage.tsx`, `ReportLayout.tsx`) carry most of the change.
