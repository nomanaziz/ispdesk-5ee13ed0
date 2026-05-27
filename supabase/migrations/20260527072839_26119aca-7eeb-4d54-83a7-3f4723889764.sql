
-- Extra roles junction (multi-role per app_user)
CREATE TABLE public.app_user_extra_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_extra_roles TO authenticated;
GRANT ALL ON public.app_user_extra_roles TO service_role;

ALTER TABLE public.app_user_extra_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view extra roles"
  ON public.app_user_extra_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage extra roles"
  ON public.app_user_extra_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-attach Employee role on app_users insert when linked to an employee
CREATE OR REPLACE FUNCTION public.auto_attach_employee_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_role_id uuid;
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT id INTO emp_role_id FROM public.app_roles WHERE name = 'Employee' LIMIT 1;
    IF emp_role_id IS NOT NULL AND (NEW.role_id IS NULL OR NEW.role_id <> emp_role_id) THEN
      INSERT INTO public.app_user_extra_roles (user_id, role_id)
      VALUES (NEW.id, emp_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_attach_employee_role ON public.app_users;
CREATE TRIGGER trg_auto_attach_employee_role
AFTER INSERT ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.auto_attach_employee_role();

-- Effective modules view: union of primary role + extra roles
CREATE OR REPLACE VIEW public.app_user_effective_modules AS
SELECT DISTINCT u.id AS user_id, m.module_group, m.module_name, m.permission
FROM public.app_users u
LEFT JOIN public.app_role_modules m
  ON m.enabled = true
 AND (
   m.role_id = u.role_id
   OR m.role_id IN (SELECT role_id FROM public.app_user_extra_roles WHERE user_id = u.id)
 )
WHERE m.module_name IS NOT NULL;

GRANT SELECT ON public.app_user_effective_modules TO authenticated;

-- Backfill: every existing employee-linked app_user gets Employee role as extra
INSERT INTO public.app_user_extra_roles (user_id, role_id)
SELECT u.id, '33333333-3333-3333-3333-333333333333'::uuid
FROM public.app_users u
WHERE u.employee_id IS NOT NULL
  AND u.role_id <> '33333333-3333-3333-3333-333333333333'::uuid
ON CONFLICT DO NOTHING;
