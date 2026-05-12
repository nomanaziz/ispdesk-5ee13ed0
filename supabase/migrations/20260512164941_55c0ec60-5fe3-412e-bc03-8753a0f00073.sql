-- Allow portal (anon) users to read invoice line items, matching bw_sales_invoices visibility.
-- Portal users authenticate via custom token and hit Supabase as anon, so they need explicit anon SELECT.
DROP POLICY IF EXISTS "Public can view bw_invoice_items" ON public.bw_invoice_items;
CREATE POLICY "Public can view bw_invoice_items"
  ON public.bw_invoice_items FOR SELECT
  TO anon, authenticated
  USING (true);