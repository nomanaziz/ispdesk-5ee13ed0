
-- 1. User type enum
DO $$ BEGIN
  CREATE TYPE app_user_type AS ENUM ('internal','external','remote_support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to app_users
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS user_type app_user_type NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text;

-- 3. Backfill: any row with employee_id => internal (already default), confirm
UPDATE public.app_users SET user_type='internal' WHERE employee_id IS NOT NULL AND user_type <> 'internal';

-- 4. New protected role "Remote Support"
INSERT INTO public.app_roles (id, name, is_protected, status)
VALUES ('44444444-4444-4444-4444-444444444444', 'Remote Support', true, 'Active')
ON CONFLICT (id) DO NOTHING;

-- 5. Remote Support modules (read-only: devices/network/tickets)
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission) VALUES
  ('44444444-4444-4444-4444-444444444444', 'NETWORK', 'Devices', true, 'view'),
  ('44444444-4444-4444-4444-444444444444', 'NETWORK', 'Network Monitoring', true, 'view'),
  ('44444444-4444-4444-4444-444444444444', 'NETWORK', 'OLT Management', true, 'view'),
  ('44444444-4444-4444-4444-444444444444', 'SUPPORT', 'Tickets', true, 'view')
ON CONFLICT DO NOTHING;

-- 6. Add My Requisition module to Employee role
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission) VALUES
  ('33333333-3333-3333-3333-333333333333', 'EMPLOYEE_SELF_SERVICE', 'My Requisition', true, 'view'),
  ('33333333-3333-3333-3333-333333333333', 'EMPLOYEE_SELF_SERVICE', 'My Accommodation', true, 'view'),
  ('33333333-3333-3333-3333-333333333333', 'EMPLOYEE_SELF_SERVICE', 'My Salary Sheet', true, 'view')
ON CONFLICT DO NOTHING;

-- 7. Force-Employee trigger: any internal employee-linked user must have Employee primary role
CREATE OR REPLACE FUNCTION public.force_employee_role_for_internal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_type = 'internal' AND NEW.employee_id IS NOT NULL THEN
    NEW.role_id := '33333333-3333-3333-3333-333333333333';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_employee_role ON public.app_users;
CREATE TRIGGER trg_force_employee_role
  BEFORE INSERT OR UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.force_employee_role_for_internal();

-- 8. Update auto-attach trigger condition (only for internal employees keep Employee as extra-safety net)
-- Existing auto_attach_employee_role already inserts into app_user_extra_roles when employee_id NOT NULL
-- and primary <> Employee. Since trigger #7 now forces primary = Employee, that path is bypassed harmlessly.

-- 9. Helper: check if app_user access is valid (not expired)
CREATE OR REPLACE FUNCTION public.is_app_user_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = _user_id
      AND status = 'active'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
$$;
