-- 1) Recreate effective views to include EXTRA roles, and exclude disabled rows

CREATE OR REPLACE VIEW public.app_user_effective_modules AS
SELECT u.id AS user_id,
       m.module_group,
       m.module_name,
       max(m.permission) AS permission
FROM public.app_users u
JOIN public.app_role_modules m
  ON m.enabled = true
 AND (
   m.role_id = u.role_id
   OR m.role_id IN (
     SELECT r.role_id FROM public.app_user_extra_roles r WHERE r.user_id = u.id
   )
 )
WHERE m.module_name IS NOT NULL
GROUP BY u.id, m.module_group, m.module_name;

GRANT SELECT ON public.app_user_effective_modules TO authenticated;
GRANT SELECT ON public.app_user_effective_modules TO service_role;

CREATE OR REPLACE VIEW public.app_user_effective_features AS
SELECT u.id AS user_id,
       f.scope,
       f.scope_key,
       f.feature_key,
       bool_or(f.enabled) AS enabled
FROM public.app_users u
JOIN public.app_role_features f
  ON (
    f.role_id = u.role_id
    OR f.role_id IN (
      SELECT r.role_id FROM public.app_user_extra_roles r WHERE r.user_id = u.id
    )
  )
GROUP BY u.id, f.scope, f.scope_key, f.feature_key;

GRANT SELECT ON public.app_user_effective_features TO authenticated;
GRANT SELECT ON public.app_user_effective_features TO service_role;

-- 2) Helper: module permission level for current auth user
CREATE OR REPLACE FUNCTION public.user_module_level(_auth_uid uuid, _group text, _name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(em.permission)::text
  FROM public.app_users u
  JOIN public.app_user_effective_modules em ON em.user_id = u.id
  WHERE u.auth_user_id = _auth_uid
    AND em.module_group = _group
    AND em.module_name  = _name
$$;

CREATE OR REPLACE FUNCTION public.user_has_module(_auth_uid uuid, _group text, _name text, _min text DEFAULT 'read')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin_or_super(_auth_uid) THEN true
    ELSE COALESCE((
      SELECT CASE max(em.permission)::text
        WHEN 'full'  THEN 3
        WHEN 'write' THEN 2
        WHEN 'read'  THEN 1
        ELSE 0
      END >= CASE _min
        WHEN 'full'  THEN 3
        WHEN 'write' THEN 2
        WHEN 'read'  THEN 1
        ELSE 1
      END
      FROM public.app_users u
      JOIN public.app_user_effective_modules em ON em.user_id = u.id
      WHERE u.auth_user_id = _auth_uid
        AND em.module_group = _group
        AND em.module_name  = _name
    ), false)
  END
$$;

-- 3) Relax clients RLS: allow staff who have CLIENTS > Client List permission
DROP POLICY IF EXISTS "Staff can view clients in their branch" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can view clients with permission" ON public.clients;

CREATE POLICY "Staff can view clients with permission"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Client List', 'read')
    OR (branch_id IS NOT NULL AND branch_id = public.get_user_branch(auth.uid()))
  );

DROP POLICY IF EXISTS "Staff can update clients with permission" ON public.clients;
CREATE POLICY "Staff can update clients with permission"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Client List', 'write')
  );

DROP POLICY IF EXISTS "Staff can insert clients with permission" ON public.clients;
CREATE POLICY "Staff can insert clients with permission"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Add Client', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Client List', 'write')
  );

DROP POLICY IF EXISTS "Staff can delete clients with permission" ON public.clients;
CREATE POLICY "Staff can delete clients with permission"
  ON public.clients FOR DELETE TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Client List', 'full')
  );