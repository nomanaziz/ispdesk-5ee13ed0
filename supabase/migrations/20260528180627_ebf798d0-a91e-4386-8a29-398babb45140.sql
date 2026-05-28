
-- 1. CONVEYANCE RECEIPTS — scope INSERT/UPDATE to owner folder or admin
DROP POLICY IF EXISTS "conveyance_receipts_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "conveyance_receipts_auth_update" ON storage.objects;

CREATE POLICY "conveyance_receipts_owner_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'conveyance-receipts'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "conveyance_receipts_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'conveyance-receipts'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'conveyance-receipts'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- 2. EMPLOYEE PHOTOS — restrict UPDATE/DELETE to admins only
DROP POLICY IF EXISTS "Authenticated users can delete employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update employee photos" ON storage.objects;

CREATE POLICY "Admins delete employee photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employee-photos' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins update employee photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employee-photos' AND public.is_admin_or_super(auth.uid()))
WITH CHECK (bucket_id = 'employee-photos' AND public.is_admin_or_super(auth.uid()));

-- 3. RESIGNATION LETTERS — scope SELECT/UPDATE/INSERT to admin or owner folder
DROP POLICY IF EXISTS "Authenticated view resignation letters" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update resignation letters" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload resignation letters" ON storage.objects;

CREATE POLICY "Resignation letters owner or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resignation-letters'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Resignation letters owner or admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resignation-letters'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Resignation letters owner or admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resignation-letters'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'resignation-letters'
  AND (
    public.is_admin_or_super(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- 4. POLLING AGENTS — hide api_key from operators
DROP POLICY IF EXISTS "Operators view branch polling agents" ON public.polling_agents;

CREATE OR REPLACE VIEW public.polling_agents_public
WITH (security_invoker = true) AS
SELECT id, name, status, last_heartbeat, branch_id, poll_interval_seconds, notes, created_at
FROM public.polling_agents;

GRANT SELECT ON public.polling_agents_public TO authenticated;

-- Allow operators to read non-sensitive columns via the view by re-adding a row-level read on base
-- limited to columns the view exposes is not possible at column level for the same role; instead,
-- recreate the operator policy but apps must use the view. The base table SELECT now is admin-only.
CREATE POLICY "Operators view branch polling agents via base"
ON public.polling_agents FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'operator'::app_role)
  AND branch_id = public.get_user_branch(auth.uid())
  AND false  -- force operators to use polling_agents_public view; api_key is never returned
);

-- 5. WARRANTY CLAIMS — restrict read to admins or staff with module permission
DROP POLICY IF EXISTS "Authenticated can view warranty_claims" ON public.warranty_claims;

CREATE POLICY "Warranty claims admin or module read"
ON public.warranty_claims FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.user_has_module(auth.uid(), 'SHOP', 'Warranty', 'read')
);

-- 6. REALTIME MESSAGES — enable RLS, allow only authenticated subscribers
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated realtime read" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated realtime write" ON realtime.messages;

CREATE POLICY "Authenticated realtime read"
ON realtime.messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated realtime write"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (true);

-- 7. set_requisition_no — add fixed search_path
ALTER FUNCTION public.set_requisition_no() SET search_path = public;
