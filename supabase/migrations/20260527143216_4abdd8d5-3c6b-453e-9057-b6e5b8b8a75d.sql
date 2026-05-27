
-- Phase 1: Probation/confirmation + weekly off on employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS probation_period_months integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS confirmation_date date,
  ADD COLUMN IF NOT EXISTS is_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_off_days integer[] NOT NULL DEFAULT '{6}'::integer[],
  ADD COLUMN IF NOT EXISTS salary_at_confirmation numeric;

-- Backfill probation_end_date from joining_date
UPDATE public.employees
   SET probation_end_date = joining_date + (probation_period_months || ' months')::interval
 WHERE probation_end_date IS NULL AND joining_date IS NOT NULL;

-- Phase 6: Catering provider profile fields
ALTER TABLE public.catering_services
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS default_meal_price numeric NOT NULL DEFAULT 120;

-- Helper: prorated leave for current year from a confirmation date
CREATE OR REPLACE FUNCTION public.calc_prorated_leave(_annual_quota integer, _confirm_date date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(
    0,
    FLOOR(_annual_quota::numeric * (13 - EXTRACT(MONTH FROM _confirm_date)) / 12)::integer
  );
$$;

-- Confirm employee: stamp confirmation, optional new salary, seed leave_balances for active categories
CREATE OR REPLACE FUNCTION public.confirm_employee(
  _employee_id uuid,
  _confirm_date date DEFAULT CURRENT_DATE,
  _new_salary numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM _confirm_date)::integer;
  r RECORD;
  v_days integer;
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.employees
     SET is_confirmed = true,
         confirmation_date = _confirm_date,
         salary_at_confirmation = COALESCE(_new_salary, salary),
         salary = COALESCE(_new_salary, salary),
         probation_end_date = COALESCE(probation_end_date, _confirm_date)
   WHERE id = _employee_id;

  FOR r IN
    SELECT id, days_allowed FROM public.leave_categories
     WHERE status = 'active' AND days_allowed > 0
  LOOP
    v_days := public.calc_prorated_leave(r.days_allowed, _confirm_date);
    INSERT INTO public.leave_balances(employee_id, category_id, year, total_days, used_days, remaining_days)
    VALUES (_employee_id, r.id, v_year, v_days, 0, v_days)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Annual refresh helper: for confirmed employees, ensure leave_balances rows for the given year
CREATE OR REPLACE FUNCTION public.refresh_yearly_leave_balances(_year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e RECORD;
  c RECORD;
  v_count integer := 0;
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR e IN SELECT id FROM public.employees WHERE is_confirmed = true AND status = 'active'
  LOOP
    FOR c IN SELECT id, days_allowed FROM public.leave_categories WHERE status='active' AND days_allowed > 0
    LOOP
      INSERT INTO public.leave_balances(employee_id, category_id, year, total_days, used_days, remaining_days)
      VALUES (e.id, c.id, _year, c.days_allowed, 0, c.days_allowed)
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;
