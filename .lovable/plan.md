# Unify Bandwidth Portal (one sidebar, one dashboard)

Right now a Bandwidth customer sees two completely separate portals: `/bw/*` (BwCustomerLayout) for billing/orders, and `/bw-panel/*` (BwPanelLayout) for MikroTik/clients. After they activate the panel they jump between two shells with two dashboards. The user wants this collapsed into **one portal with one sidebar**, where panel-only menus appear/disappear based on subscription status.

## 1. Single layout & route namespace

- Make `BwCustomerLayout` the **only** shell. Delete `BwPanelLayout` usage.
- Keep all routes under `/bw/*`. Migrate every `/bw-panel/*` route to `/bw/panel/*` and add redirects from the old paths so old links/bookmarks still work.
- Remove the "Open My Panel" CTA card and the "← Back to Billing" pill — they no longer make sense once it's one shell.

## 2. One sidebar, two states

Single sidebar with grouped menu (icons fixed via `Icons8Icon` / `resolveIcons8`, same pattern as POP Admin):

**Always visible (billing customer):**
- Dashboard
- Billing & Invoices
- Service Orders (Upgrade / Downgrade requests)
- Support Tickets
- Company Settings

**Visible only when `panel_access_enabled && panel_subscription_expires_at > now`:**
- MikroTik Servers
- Clients (List / Add / Bulk Import)
- Billing List / Daily Collection
- Online Monitoring
- SMS (Templates / Send / Gateway)
- Employees
- Accounting (Income / Expense / Cash Book)
- Reports (Bill Collection / Customer / Financial)

When the panel is inactive, those entries are simply hidden (not greyed out). A small "Activate Panel" pill stays in the sidebar header so the trial user can upgrade.

## 3. Unified dashboard (`/bw/dashboard`)

Single page replacing both `BwDashboard.tsx` and `BwPanelDashboard.tsx`.

**Top — "Relationship with Admin" summary card (always shown):**
- Customer name, code, contact info
- Subscribed services chips: Internet, FNN, GGC, BDX (derived from active `bw_sales_invoices` / package metadata)
- Total Due, This-Month Paid, Last Invoice, Next Due Date (existing KPIs)
- Quick links: New Service Order, Pay Now (online), Company Settings
- Recent invoices (5) + Recent service orders (5)

**Bottom — Panel summary (only when panel active):**
- KPIs: Total Clients, Online Now, MikroTik Servers, Daily Collection, Employees
- Top performing clients (by traffic)
- Quick tiles: Add Client, Billing, Online Monitoring, Send SMS, Reports

When panel inactive, the bottom section is replaced by a single "Unlock Panel" promo card.

## 4. Service Orders rework

Replace generic "Purchase Orders" UI with two-action flow:

- **Bandwidth Upgrade** — instant request; once approved, takes effect immediately, billing prorated from approval date.
- **Bandwidth Downgrade** — requires **minimum 1 month notice**. Form forces `effective_date >= today + 30 days` and shows a notice banner explaining the rule.

List page shows both upgrade and downgrade requests with status (pending/approved/rejected/scheduled).

Backend: reuse existing `bw_purchase_orders` table by adding/using a `request_type` column (`upgrade` | `downgrade`) and `effective_date`. Validation lives in the create dialog; admin-side approval flow stays as-is.

## 5. Bulk Client Import — back navigation

`BulkClientImportHub` (used at `/bw-panel/clients/bulk`, will move to `/bw/panel/clients/bulk`) currently has no exit. Add a standard page header with:
- "← Back to Clients" button (navigates to `/bw/panel/clients`)
- Breadcrumb: Dashboard › Clients › Bulk Import

Apply same back-header pattern to other deep panel pages that lack it (Add Client, Add Employee, SMS Send) for consistency.

## 6. Invoices — keep with online pay

Invoices page stays as a standalone route (`/bw/invoices`) and keeps the existing "Pay Online" button (bKash / Nagad / SSLCommerz already wired). Just re-skin to match the new unified header.

## 7. Sidebar icon fixes

The current BW sidebar has plain Lucide icons even though `Icons8Icon` is imported. Bind every menu entry to its `icons8` slug (same set the POP Admin sidebar uses) so the colorful PNGs appear in both desktop sidebar and mobile bottom bar:

| Menu | icons8 slug |
|---|---|
| Dashboard | `business` |
| Billing & Invoices | `folder-invoices` |
| Service Orders | `purchase-order` |
| Support Tickets | `online-support` |
| Company Settings | `settings` |
| MikroTik | `router` |
| Clients | `conference-call` |
| Bulk Import | `import` |
| Billing List | `bill` |
| Daily Collection | `cash-in-hand` |
| Online Monitoring | `wifi-router` |
| SMS | `sms` |
| Employees | `manager` |
| Accounting | `accounting` |
| Reports | `combo-chart` |

## Technical details

**Files to edit:**
- `src/components/BwCustomerLayout.tsx` — expand sidebar with grouped menu + conditional panel groups; remove "Open My Panel" upgrade card (replace with thin "Activate" pill in trial mode).
- `src/pages/bw-customer/BwDashboard.tsx` — fold panel KPIs into a conditional section.
- `src/pages/bw-customer/BwPurchaseOrders.tsx` → rename concept to `BwServiceOrders.tsx`; add upgrade/downgrade dialogs with the 30-day rule.
- `src/App.tsx` — move every `/bw-panel/*` route under `/bw/panel/*` wrapped in `BwCustomerLayout`; add legacy redirects; drop `BwPanelLayout` usage.
- `src/pages/reseller/clients/BulkClientImportHub.tsx` — add `PageHeader` with back link + breadcrumb (only when rendered inside `/bw/*`).

**Files to delete:**
- `src/components/BwPanelLayout.tsx`
- `src/pages/bw-panel/BwPanelDashboard.tsx`

**Schema:** add `request_type text` and `effective_date date` to `bw_purchase_orders` (migration). Keep RLS unchanged.

**Auth/guards:** `BwPanelProtectedRoute` becomes a per-route guard on the panel-only routes inside the unified layout — it just checks `panel_access_enabled` and redirects to `/bw/dashboard` with a toast if disabled.

## Out of scope (do later)

- Wiring real-time client/MikroTik counters into the dashboard panel section (placeholders for now).
- Public pricing page for the panel trial-to-paid upgrade flow.
- Mobile redesign of the new merged dashboard beyond the existing responsive grid.
