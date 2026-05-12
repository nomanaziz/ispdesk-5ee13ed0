DROP POLICY IF EXISTS "Authenticated can view bw_sales_invoices" ON public.bw_sales_invoices;
CREATE POLICY "Public can view bw_sales_invoices"
  ON public.bw_sales_invoices FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view bw_purchase_orders" ON public.bw_purchase_orders;
CREATE POLICY "Public can view bw_purchase_orders"
  ON public.bw_purchase_orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can view support_tickets" ON public.support_tickets;
CREATE POLICY "Public can view support_tickets"
  ON public.support_tickets FOR SELECT TO anon, authenticated USING (true);