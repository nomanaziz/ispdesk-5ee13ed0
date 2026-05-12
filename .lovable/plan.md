Root cause found:
- `public_payment_requests` is built for normal client bills: `client_id` is required and `billing_id` points to `billing.id`.
- BW invoice payment is incorrectly inserting a BW customer id into `billing_id` and no `client_id`, so RLS/FK blocks it.
- `bw_purchase_orders.reseller_id` currently has an FK to `branch_managers.id`, but BW bandwidth customers/invoices use `bw_sale_customers.id`. That is why service upgrade/downgrade and RechargeServer paths hit `bw_purchase_orders_reseller_id_fkey`.

Implementation plan:

1. Database migration
- Update `public_payment_requests` so it can safely represent BW invoice payments:
  - allow BW invoice payment requests without a normal `clients.id`
  - add/link BW invoice and BW customer identity fields where needed
  - keep admin-only viewing/updating rules for existing requests
- Replace the incorrect `bw_purchase_orders.reseller_id` FK behavior:
  - remove the hard FK to `branch_managers.id` because this table is now used by BW customers too
  - validate portal identity inside the secure RPC instead of relying on the wrong FK
- Update/create secure RPCs:
  - `create_bw_portal_service_order(...)` validates portal session and validates the customer against `bw_sale_customers` / `branch_managers` based on user type before inserting
  - `create_bw_invoice_payment_request(...)` creates BW invoice payment requests via `SECURITY DEFINER`, so the browser does not directly insert into RLS-protected payment tables

2. Frontend payment fix
- Update `src/components/reseller/PayBillDialog.tsx`:
  - stop direct insert into `public_payment_requests`
  - call the new `create_bw_invoice_payment_request` RPC
  - send gateway success/cancel URLs to `payment-callback` with `request_id`, `gateway`, and status, instead of returning directly to the invoice page without backend verification

3. Edge function callback fix
- Update `supabase/functions/payment-callback/index.ts`:
  - detect BW invoice payment requests
  - verify RechargeServer/bKash/Nagad/SSLCommerz response
  - update `public_payment_requests` status
  - insert approved payment into `bw_sale_collections`
  - update `bw_sales_invoices.paid_amount`, `due`, and payment status
  - redirect back to `/bw/invoices/:id` or `/reseller/invoices/:id` with success/fail

4. Service upgrade/downgrade fix
- Update the service order RPC/migration so upgrade, downgrade, discontinue inserts no longer depend on the wrong `branch_managers` FK.
- Keep `src/pages/bw-customer/BwPurchaseOrders.tsx` using the RPC, but adjust if the RPC return/signature changes.

5. Verification
- Confirm policies/functions exist in Supabase.
- Test with the current failing BW customer invoice (`ddbb78b2-992a-4ae8-968a-ed563848419b`) and customer (`cad4c1ce-37db-4636-a5b9-80dee92e6b66`).
- Verify:
  - RechargeServer checkout starts without RLS error
  - callback records payment against BW invoice
  - upgrade/downgrade/discontinue creates order without FK error