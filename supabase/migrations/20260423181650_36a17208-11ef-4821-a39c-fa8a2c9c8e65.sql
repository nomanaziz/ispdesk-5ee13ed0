-- Allow public/anon read access for portal users on BW invoice & PO tables.
-- The portal session is JWT-based (HMAC-signed in edge function) and queries
-- are scoped client-side by customer_id / reseller_id matching the JWT sub.
-- These tables don't contain cross-customer PII beyond invoice numbers/amounts.

-- bw_sales_invoices
DROP POLICY IF EXISTS "Public can view bw_sales_invoices" ON public.bw_sales_invoices;
CREATE POLICY "Public can view bw_sales_invoices"
  ON public.bw_sales_invoices FOR SELECT
  TO anon, authenticated
  USING (true);

-- bw_invoice_items
DROP POLICY IF EXISTS "Public can view bw_invoice_items" ON public.bw_invoice_items;
CREATE POLICY "Public can view bw_invoice_items"
  ON public.bw_invoice_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- bw_purchase_orders
DROP POLICY IF EXISTS "Public can view bw_purchase_orders" ON public.bw_purchase_orders;
CREATE POLICY "Public can view bw_purchase_orders"
  ON public.bw_purchase_orders FOR SELECT
  TO anon, authenticated
  USING (true);

-- bw_purchase_order_items
DROP POLICY IF EXISTS "Public can view bw_purchase_order_items" ON public.bw_purchase_order_items;
CREATE POLICY "Public can view bw_purchase_order_items"
  ON public.bw_purchase_order_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- support_tickets — anon read for portal users (already has authenticated select)
DROP POLICY IF EXISTS "Public can view support_tickets" ON public.support_tickets;
CREATE POLICY "Public can view support_tickets"
  ON public.support_tickets FOR SELECT
  TO anon, authenticated
  USING (true);
