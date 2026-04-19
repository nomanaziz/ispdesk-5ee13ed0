

## Goal
Fix POP/BW-customer portal so data syncs correctly, simplify Purchase Orders into a Package Upgrade flow, fix ticket creation, auto-populate Company Setup, and lay the foundation for a tiered "Reseller Rental" feature controlled by Admin subscription.

## Investigation summary
After reviewing the code I see:
1. **Data sync** — `ResellerDashboard.tsx` uses `customer.parent_reseller_id || customer.sub` as `resellerId` and queries `bw_sales_invoices.customer_id`. For a BW customer, `customer.sub` is correct, but for `reseller_sub` users `parent_reseller_id` may not match the invoice owner. Same mapping issue exists in `ResellerInvoices.tsx` and elsewhere — invoices/bills exist in DB but are queried under wrong id.
2. **Tickets** — `support_tickets` insert from reseller likely missing required fields (`customer_id`, `source`, `tenant_id`) or RLS blocks it.
3. **Company Setup (`ResellerSettings.tsx`)** — fields shown as generic "Customer Name / Contact Person" and not pre-filled from `bw_sale_customers` or `pops` row.
4. **Purchase Orders** — current flow lets user build line items from scratch; should instead pick from current packages/services with Upgrade/Downgrade/New.
5. **No subscription/feature-flag** model yet for granting "Full Reseller Panel" access.

## Plan

### 1. Fix data sync (highest priority)
- Centralize "billing identity" resolver: a single helper `getBillingCustomerId(customer)` that returns the correct id used in `bw_sales_invoices.customer_id` for all 3 types (`reseller`, `reseller_sub` → parent, `bw_customer` → self).
- Apply it in: `ResellerDashboard.tsx`, `ResellerInvoices.tsx`, `ResellerInvoiceDetail.tsx`, `ResellerPurchaseOrders.tsx`.
- Verify `bw_sales_invoices` rows actually match by querying DB during fix.

### 2. Simplify Purchase Order → "Package Request"
- Rename UI label to **"Package Request / Upgrade"**.
- Replace free-form line-item form with 3 actions:
  - **New Package** — pick from active `bw_services` list
  - **Upgrade** — pick a current active service, choose target service (higher price)
  - **Downgrade** — same, target lower price
- Submit creates a `bw_purchase_orders` row with `request_type` (new column) and a single linked service id; admin approves in existing flow.
- Hide the old multi-line UI for resellers (admin can still create complex POs from admin panel).

### 3. Fix Support Ticket creation
- Inspect reseller `CreateTicketDialog` insert payload; ensure required columns (`source='bw_reseller'`, `customer_id`, `tenant_id` if applicable, `ticket_no` via trigger or generated client-side).
- Check RLS policy on `support_tickets` for portal session role; add policy if missing.

### 4. Company Setup auto-populate
- In `ResellerSettings.tsx`: on mount, fetch the user's `bw_sale_customers` (or `pops`) row by `customer.sub` and prefill all fields (company name, address, contact person, phone, email, NID/TIN).
- Rename "Customer Name" → **"Company Name"** and keep "Contact Person" separate.
- Save updates back to the same row.

### 5. Foundation for Reseller Rental Subscription (scaffold only)
- New table `reseller_subscriptions` (admin-managed): `customer_id`, `plan` (`basic` | `full_reseller`), `features jsonb`, `active`, `expires_at`.
- New admin page link (placeholder) to toggle. Defer the actual "Full Reseller Panel" UI build (Client Management, Billing, sub-reseller creation) to a follow-up — too large for this loop.
- Gate menu items in `ResellerLayout.tsx` based on subscription features. For now everyone keeps current "basic" view.
- Add **two-tab dashboard** scaffold: **Upstream** (current dashboard = ISP billing) and **Downstream** (placeholder shown only when `full_reseller` active).

### 6. Admin: BW Customer category in admin panel
- Add a sidebar entry under Bandwidth Sale → **"BW Customers & End Users"** that lists POP/Reseller customers and (when full_reseller) their downstream end users — feeds BTRC reports later. Scaffold list page only this loop.

### 7. Payment: own bKash vs admin bKash
- Add to `ResellerSettings.tsx` a **"Payment Receiving"** section: radio `Use Admin bKash` / `Use My Own bKash` + own number field. Stored on `bw_sale_customers` (new columns `payment_mode`, `own_bkash_number`). Used later by payment flow.

## Files to change
- `src/lib/portalIdentity.ts` (new helper)
- `src/pages/reseller/ResellerDashboard.tsx`
- `src/pages/reseller/ResellerInvoices.tsx`
- `src/pages/reseller/ResellerInvoiceDetail.tsx`
- `src/pages/reseller/ResellerPurchaseOrders.tsx`
- `src/pages/reseller/ResellerPurchaseOrderForm.tsx` (rewrite as Package Request)
- `src/pages/reseller/ResellerSettings.tsx`
- `src/pages/reseller/ResellerTickets.tsx` + ticket create dialog
- `src/components/ResellerLayout.tsx` (subscription gating, dashboard tabs)
- `supabase/functions/portal-data/index.ts` (return subscription + correct billing id)
- New admin scaffold: `src/pages/dashboard/bw-sale/BwCustomersAndEndUsers.tsx` + route

## Database migrations
- `bw_purchase_orders`: add `request_type text`, `target_service_id uuid`, `current_service_id uuid`
- `bw_sale_customers`: add `payment_mode text default 'admin'`, `own_bkash_number text`
- New table `reseller_subscriptions` with RLS (admin-only write, owner read)
- Verify/add RLS policy on `support_tickets` allowing portal-token inserts where `source='bw_reseller'`

## Out of scope this loop (follow-up)
- Full downstream client-management, sub-reseller billing engine, BTRC report wiring, payment-routing logic. These are large features — handled after the foundation lands and Admin enables `full_reseller` for a test customer.

