
-- Drop the overly permissive update policy on alerts
DROP POLICY IF EXISTS "Authenticated can update own alerts" ON public.alerts;

-- Replace with a more restrictive policy: authenticated users can mark alerts as read
CREATE POLICY "Authenticated can mark alerts read" ON public.alerts
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()) OR true)
  WITH CHECK (is_read = true);
