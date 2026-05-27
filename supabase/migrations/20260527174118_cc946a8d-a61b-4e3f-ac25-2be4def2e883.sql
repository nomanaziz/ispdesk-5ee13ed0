
-- Remove the security-definer views (they triggered linter errors)
DROP VIEW IF EXISTS public.my_app_user;
DROP VIEW IF EXISTS public.my_employee;

-- Restore self-read policies
CREATE POLICY "Self can view own app_user"
ON public.app_users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Self can view own employee"
ON public.employees
FOR SELECT
TO authenticated
USING (id = public.current_employee_id());

-- Column-level: revoke SELECT on the credential columns from anon/authenticated
-- Only service_role retains full SELECT (used by edge functions / admin tasks)
REVOKE SELECT (password) ON public.app_users FROM authenticated;
REVOKE SELECT (password) ON public.app_users FROM anon;

REVOKE SELECT (user_password) ON public.employees FROM authenticated;
REVOKE SELECT (user_password) ON public.employees FROM anon;
