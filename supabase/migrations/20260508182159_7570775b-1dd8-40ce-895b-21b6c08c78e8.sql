
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;

CREATE POLICY "Staff can view clients in their branch"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR (branch_id IS NOT NULL AND branch_id = public.get_user_branch(auth.uid()))
  );
