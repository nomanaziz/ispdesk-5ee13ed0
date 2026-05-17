
-- Remove anon access to bandwidth billing tables
DROP POLICY IF EXISTS "Public can view bw_sales_invoices" ON public.bw_sales_invoices;
DROP POLICY IF EXISTS "Public can view bw_invoice_items" ON public.bw_invoice_items;
DROP POLICY IF EXISTS "Public can view bw_purchase_orders" ON public.bw_purchase_orders;

CREATE POLICY "Authenticated view bw_sales_invoices" ON public.bw_sales_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated view bw_purchase_orders" ON public.bw_purchase_orders
  FOR SELECT TO authenticated USING (true);

-- Restrict vas_subscriptions (contains plaintext credentials) to admins only
DROP POLICY IF EXISTS "Authenticated users can view vas_subscriptions" ON public.vas_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert vas_subscriptions" ON public.vas_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update vas_subscriptions" ON public.vas_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete vas_subscriptions" ON public.vas_subscriptions;

CREATE POLICY "Admins view vas_subscriptions" ON public.vas_subscriptions
  FOR SELECT TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Admins insert vas_subscriptions" ON public.vas_subscriptions
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_super(auth.uid()));
CREATE POLICY "Admins update vas_subscriptions" ON public.vas_subscriptions
  FOR UPDATE TO authenticated USING (is_admin_or_super(auth.uid())) WITH CHECK (is_admin_or_super(auth.uid()));
CREATE POLICY "Admins delete vas_subscriptions" ON public.vas_subscriptions
  FOR DELETE TO authenticated USING (is_admin_or_super(auth.uid()));
