
-- Seed NAHID confirmation + leave balances
DO $$
DECLARE
  v_emp uuid := '33e76882-34fc-427d-af3a-4a5d738f1c10';
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  r RECORD;
  v_days int;
BEGIN
  UPDATE public.employees
     SET is_confirmed = true,
         confirmation_date = CURRENT_DATE,
         weekly_off_days = '{6}'::integer[],
         probation_end_date = CURRENT_DATE,
         salary_at_confirmation = COALESCE(salary_at_confirmation, salary)
   WHERE id = v_emp;

  FOR r IN SELECT id, days_allowed FROM public.leave_categories WHERE status='active' AND days_allowed > 0 LOOP
    v_days := public.calc_prorated_leave(r.days_allowed, CURRENT_DATE);
    INSERT INTO public.leave_balances(employee_id, category_id, year, total_days, used_days, remaining_days)
    VALUES (v_emp, r.id, v_year, v_days, 0, v_days)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
