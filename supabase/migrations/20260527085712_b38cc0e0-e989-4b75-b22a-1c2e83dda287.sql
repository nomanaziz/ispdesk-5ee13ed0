
-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.perm_level AS ENUM ('none','read','write','full');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Normalize existing permission strings before converting
UPDATE public.app_role_modules SET permission = 'read'  WHERE permission IN ('view');
UPDATE public.app_role_modules SET permission = 'write' WHERE permission IN ('edit','manage');
UPDATE public.app_role_modules SET permission = 'none'  WHERE permission IS NULL OR permission NOT IN ('read','write','full','none');

-- 3. Drop dependent view, convert column, recreate view
DROP VIEW IF EXISTS public.app_user_effective_modules;

ALTER TABLE public.app_role_modules
  ALTER COLUMN permission DROP DEFAULT,
  ALTER COLUMN permission TYPE public.perm_level USING permission::public.perm_level,
  ALTER COLUMN permission SET DEFAULT 'read'::public.perm_level,
  ALTER COLUMN permission SET NOT NULL;

-- Recreate view with MAX (full > write > read > none)
CREATE VIEW public.app_user_effective_modules
WITH (security_invoker = on) AS
SELECT
  u.id AS user_id,
  m.module_group,
  m.module_name,
  MAX(m.permission)::public.perm_level AS permission
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
GRANT ALL    ON public.app_user_effective_modules TO service_role;

-- 4. Helper: is super admin (by app_users.role_id or by auth user_roles)
CREATE OR REPLACE FUNCTION public.is_super_admin(_auth_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _auth_uid AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.app_roles r ON r.id = u.role_id
      WHERE u.auth_user_id = _auth_uid
        AND lower(r.name) IN ('super admin','super_admin')
    );
$$;

-- 5. Core: effective permission for current user on a module
CREATE OR REPLACE FUNCTION public.get_user_module_permission(_module text, _auth_uid uuid DEFAULT auth.uid())
RETURNS public.perm_level
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_level public.perm_level;
BEGIN
  IF _auth_uid IS NULL THEN RETURN 'none'::public.perm_level; END IF;

  IF public.is_super_admin(_auth_uid) THEN
    RETURN 'full'::public.perm_level;
  END IF;

  SELECT MAX(m.permission)::public.perm_level
    INTO v_level
  FROM public.app_users u
  LEFT JOIN public.app_user_extra_roles ext ON ext.user_id = u.id
  JOIN public.app_role_modules m
    ON m.enabled = true
   AND m.module_name = _module
   AND (m.role_id = u.role_id OR m.role_id = ext.role_id)
  WHERE u.auth_user_id = _auth_uid;

  RETURN COALESCE(v_level, 'none'::public.perm_level);
END $$;

-- 6. Convenience booleans
CREATE OR REPLACE FUNCTION public.can_read(_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_user_module_permission(_module) IN ('read','write','full');
$$;

CREATE OR REPLACE FUNCTION public.can_write(_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_user_module_permission(_module) IN ('write','full');
$$;

CREATE OR REPLACE FUNCTION public.can_delete(_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_user_module_permission(_module) = 'full';
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid)            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_module_permission(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write(text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete(text)                TO authenticated;
