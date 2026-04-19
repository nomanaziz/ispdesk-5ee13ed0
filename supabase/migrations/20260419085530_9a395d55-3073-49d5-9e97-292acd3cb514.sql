DROP POLICY IF EXISTS "Authenticated insert billing_history" ON public.billing_history;
CREATE POLICY "Admins insert billing_history"
  ON public.billing_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));