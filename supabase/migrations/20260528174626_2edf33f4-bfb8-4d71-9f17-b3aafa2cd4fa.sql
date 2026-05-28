
-- 1. events_holidays: add source + external_id
ALTER TABLE public.events_holidays 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS events_holidays_external_unique
  ON public.events_holidays(source, external_id, event_date)
  WHERE external_id IS NOT NULL;

-- 2. bd_government_holidays table
CREATE TABLE IF NOT EXISTS public.bd_government_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  date date NOT NULL,
  title_bn text NOT NULL,
  title_en text,
  category text NOT NULL DEFAULT 'public',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, date, title_en)
);

GRANT SELECT ON public.bd_government_holidays TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bd_government_holidays TO authenticated;
GRANT ALL ON public.bd_government_holidays TO service_role;

ALTER TABLE public.bd_government_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bd_holidays read all" ON public.bd_government_holidays FOR SELECT USING (true);
CREATE POLICY "bd_holidays admin write" ON public.bd_government_holidays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. leave_categories: add new policy fields
ALTER TABLE public.leave_categories
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS min_service_months integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carry_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_carry_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true;

-- 4. employee_leave_balances
CREATE TABLE IF NOT EXISTS public.employee_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  category_id uuid NOT NULL,
  year integer NOT NULL,
  allocated numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  carried_from_prev numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, category_id, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_leave_balances TO authenticated;
GRANT ALL ON public.employee_leave_balances TO service_role;

ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_balances read auth" ON public.employee_leave_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_balances admin write" ON public.employee_leave_balances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 5. Permission migration: LEAVE > Setup -> HR_PAYROLL > Events & Holidays
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT role_id, 'HR_PAYROLL', 'Events & Holidays', enabled, permission
FROM public.app_role_modules
WHERE module_group='LEAVE' AND module_name='Setup'
ON CONFLICT DO NOTHING;

DELETE FROM public.app_role_modules WHERE module_group='LEAVE' AND module_name='Setup';

-- Ensure Super Admin/Admin have full access on new module
UPDATE public.app_role_modules arm
SET enabled=true, permission='full'
FROM public.app_roles r
WHERE arm.role_id=r.id
  AND arm.module_group='HR_PAYROLL' AND arm.module_name='Events & Holidays'
  AND r.name IN ('Super Admin','Admin');

-- 6. recalculate_leave_balances function
CREATE OR REPLACE FUNCTION public.recalculate_leave_balances(_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.employee_leave_balances (employee_id, category_id, year, allocated, used, carried_from_prev)
  SELECT
    e.id,
    c.id,
    _year,
    c.days_allowed,
    0,
    0
  FROM public.employees e
  CROSS JOIN public.leave_categories c
  WHERE e.status = 'active'
    AND c.status = 'active'
    AND (c.gender = 'any' OR LOWER(COALESCE(e.gender,'')) = c.gender)
  ON CONFLICT (employee_id, category_id, year) DO UPDATE
    SET allocated = EXCLUDED.allocated,
        updated_at = now();
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- 7. Seed default BD leave categories if not present
INSERT INTO public.leave_categories (name, days_allowed, description, gender, is_paid, carry_forward, max_carry_days, status)
SELECT v.name, v.days, v.descr, v.gender, v.paid, v.carry, v.maxc, 'active'
FROM (VALUES
  ('নৈমিত্তিক ছুটি (Casual)', 10, 'বছরে ১০ দিন', 'any', true, false, 0),
  ('অসুস্থতাজনিত ছুটি (Sick)', 14, 'ডাক্তারি সনদ প্রয়োজন হতে পারে', 'any', true, false, 0),
  ('অর্জিত ছুটি (Earned)', 20, 'ক্যারি-ফরোয়ার্ড সম্ভব', 'any', true, true, 40),
  ('মাতৃত্বকালীন ছুটি (Maternity)', 112, 'শুধু মহিলা কর্মচারীদের জন্য', 'female', true, false, 0),
  ('পিতৃত্বকালীন ছুটি (Paternity)', 7, 'শুধু পুরুষ কর্মচারীদের জন্য', 'male', true, false, 0),
  ('বেতনহীন ছুটি (Without Pay)', 0, 'অবৈতনিক', 'any', false, false, 0)
) AS v(name, days, descr, gender, paid, carry, maxc)
WHERE NOT EXISTS (SELECT 1 FROM public.leave_categories lc WHERE lc.name = v.name);
