

## Bandwidth Reseller Portal — Full Build

### বর্তমান অবস্থা
- `ResellerLayout.tsx` আছে কিন্তু minimal (Dashboard, Balance, Clients menu)
- `ResellerDashboard.tsx` exists, কিন্তু image-এর মতো rich dashboard নেই
- `bw_sales_invoices` table আছে → `PortalInvoices` দেখায়
- BW Reseller-এর জন্য Purchase Orders, Support Tickets, User Management, Company Settings — কোনোটাই full নেই
- Admin-side `Tickets.tsx` আছে কিন্তু "Bandwidth Reseller" tab আলাদা না

### লক্ষ্য (image অনুসরণে)

BW Reseller portal-এ ৬টা menu:
1. **Dashboard** — Welcome card + POPCode/UserName + 6টা stat box (Balance Due, Last Invoice Info, Payment Due Date, This Month Paid, Purchase Order Status, Ticket) + Messages + Notices
2. **Billing Invoices** — table (Sr/Bill No/Month/Amount/Paid/Discount/Due/Status/Action) → bill no click → invoice details page; Action PDF icon → printable invoice page (Download PDF); "Pay" button → bKash dialog
3. **Purchase Orders** — list + "+ New Order" → form (Billing Month, line items: Item/Description/Unit/Qty/Rate/VAT/From/To/Total, Note, Save)
4. **Support Tickets** — list + "Open New Ticket" → reuses existing ticket flow; backend insert with `source = 'bw_reseller'` so admin Tickets page shows them under "Bandwidth Reseller" tab
5. **User Management** — sub-users CRUD; permission tree (cannot delete reseller itself); permissions limit which menus sub-user sees
6. **Company Settings** — reseller's own company info edit (name, logo, address, contact, email)

### Approach সংক্ষিপ্তে

**Routing**: `/reseller/*` — protected by `usePortalAuth` with `customer.type === 'reseller'`. Reuse `ResellerLayout` but expand sidebar menu। 

**Admin tickets tab**: Existing `support_tickets` table-এ `source` column থাকলে সেটা ব্যবহার; না থাকলে migration-এ add করব (`source text default 'client'`, values: `client | pop | bw_reseller`)। Admin `Tickets.tsx`-এ tab filter add।

**Sub-user permissions**: নতুন table `bw_reseller_users (id, reseller_id, name, username, password, status, permissions jsonb, created_at)` — permissions জসন: `{ dashboard, invoices, purchases, tickets, users, settings }` boolean। `portal-auth` edge function-এ sub-user login support add (lookup in this table, return parent reseller_id + permissions in token)। Sidebar render conditionally।

**PDF**: Invoice details page reuses existing print-friendly template (image-77 style) — add `window.print()` or html2pdf via existing pattern in admin invoice. Phase 1: print-to-PDF via browser; Phase 2: server-side PDF।

**bKash payment**: `Pay` button opens dialog (image-76 style) → calls existing `rechargeserver-payment` edge function or new wrapper for bw invoices। Phase 1: dialog UI + mock flow; live bKash already wired in admin side, reuse that endpoint।

### Files

| File | Action |
|------|--------|
| migration | `support_tickets.source` column add (if missing); `bw_reseller_users` table + RLS; `bw_purchase_orders` already exists check |
| `src/components/ResellerLayout.tsx` | Expand sidebar to 6 items, image-style dark navy theme, search box, user chip top-right |
| `src/pages/reseller/ResellerDashboard.tsx` | Rebuild — welcome card, POP/UserName row, 6 stat cards, Messages, Notices |
| `src/pages/reseller/ResellerInvoices.tsx` | NEW — table + Pay/Due badges + PDF action |
| `src/pages/reseller/ResellerInvoiceDetail.tsx` | NEW — Invoice Items + Invoice Payments tables (image-75) |
| `src/pages/reseller/ResellerInvoicePrint.tsx` | NEW — printable invoice (image-77) with Download PDF button |
| `src/pages/reseller/ResellerPurchaseOrders.tsx` | NEW — list (image-79) |
| `src/pages/reseller/ResellerPurchaseOrderForm.tsx` | NEW — create/edit (image-78) |
| `src/pages/reseller/ResellerTickets.tsx` | NEW — list + Open New Ticket dialog (image-80); inserts with `source='bw_reseller'` |
| `src/pages/reseller/ResellerUsers.tsx` | NEW — sub-user CRUD + permission checkbox tree (image-81) |
| `src/pages/reseller/ResellerSettings.tsx` | NEW — company info edit |
| `src/components/reseller/PayBillDialog.tsx` | NEW — bKash payment dialog |
| `src/components/reseller/PermissionTree.tsx` | NEW — checkbox grid for 6 menus |
| `src/contexts/PortalAuthContext.tsx` | Extend to include `permissions` from token (for sub-user) |
| `src/components/ResellerProtectedRoute.tsx` | Check menu permission too |
| `src/App.tsx` | Add all reseller routes |
| `supabase/functions/portal-auth/index.ts` | Add sub-user lookup (`bw_reseller_users`); return permissions |
| `src/pages/dashboard/support/Tickets.tsx` | Add "Bandwidth Reseller" tab (filter `source='bw_reseller'`) |

### Sidebar (BW Reseller)

```text
NARYANGANJ POP - GALAXY NET    ☰
[Menu Search...]
🚀 DASHBOARD
🕓 BILLING INVOICES
⚒ PURCHASE ORDERS
💡 SUPPORT TICKETS
👥 USER MANAGEMENT
⚙ COMPANY SETTINGS
```

Theme: dark navy (`#1f3a5f`) like image, white text, active item lighter shade।

### Phasing

- **Phase 1 (এখন):** All 6 pages, layout redesign, sub-user table + permissions, admin Tickets tab, print-PDF via browser, bKash dialog UI
- **Phase 2 (পরে):** Server-side PDF generation, live bKash backend wiring (if not already), email notifications on ticket/invoice events

