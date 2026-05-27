
-- 1. app_users: remove self-read of password, replace with safe view
DROP POLICY IF EXISTS "Self can view own app_user" ON public.app_users;

CREATE OR REPLACE VIEW public.my_app_user
WITH (security_invoker = off) AS
SELECT id, username, status, employee_id, role_id, auth_user_id, email,
       full_name, purpose, access_expires_at, created_by, created_at,
       updated_at, user_type
FROM public.app_users
WHERE auth_user_id = auth.uid();

GRANT SELECT ON public.my_app_user TO authenticated;

-- 2. employees: remove self-read of user_password, replace with safe view
DROP POLICY IF EXISTS "Self can view own employee" ON public.employees;

CREATE OR REPLACE VIEW public.my_employee
WITH (security_invoker = off) AS
SELECT id, employee_id, name, email, phone, address, department_id, position_id,
       joining_date, salary, status, created_at, updated_at, show_on_website,
       device_user_id, date_of_birth, gender, personal_phone, office_phone,
       guardian_phone, marital_status, nid_number, facebook_link, reference,
       district, upazila, permanent_address, working_experience, last_degree,
       institution, passing_year, punch_card_id, default_in_time, default_out_time,
       zkteco_device_id, image_url, payroll_template_id, branch_id, has_user_access,
       user_permissions, sub_user_id, division_id, district_id, upazila_id,
       default_shift_id, probation_period_months, probation_end_date,
       confirmation_date, is_confirmed, weekly_off_days, salary_at_confirmation
FROM public.employees
WHERE id = public.current_employee_id();

GRANT SELECT ON public.my_employee TO authenticated;

-- 3. zkteco_device_users: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view device users" ON public.zkteco_device_users;

CREATE POLICY "Admins can view device users"
ON public.zkteco_device_users
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 4. client_news_events: restrict writes to admins only
DROP POLICY IF EXISTS "Authenticated can insert news/events" ON public.client_news_events;
DROP POLICY IF EXISTS "Authenticated can update news/events" ON public.client_news_events;
DROP POLICY IF EXISTS "Authenticated can delete news/events" ON public.client_news_events;

CREATE POLICY "Admins can insert news/events"
ON public.client_news_events
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update news/events"
ON public.client_news_events
FOR UPDATE
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete news/events"
ON public.client_news_events
FOR DELETE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 5. Fix function search_path
CREATE OR REPLACE FUNCTION public.calc_prorated_leave(_annual_quota integer, _confirm_date date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT GREATEST(
    0,
    FLOOR(_annual_quota::numeric * (13 - EXTRACT(MONTH FROM _confirm_date)) / 12)::integer
  );
$function$;
