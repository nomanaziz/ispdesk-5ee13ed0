
-- Phase 1: Employee self-service access (NAHID/EMP001 fix)
-- Allow logged-in employees to read their own app_users, employees,
-- attendance, leave, payroll, leave_balances rows.

-- 1) app_users: self-read
DROP POLICY IF EXISTS "Self can view own app_user" ON public.app_users;
CREATE POLICY "Self can view own app_user"
  ON public.app_users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 2) employees: self-read via app_users link
DROP POLICY IF EXISTS "Self can view own employee" ON public.employees;
CREATE POLICY "Self can view own employee"
  ON public.employees FOR SELECT
  TO authenticated
  USING (id = public.current_employee_id());

-- 3) attendance: self-read
DROP POLICY IF EXISTS "Self can view own attendance" ON public.attendance;
CREATE POLICY "Self can view own attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (employee_id = public.current_employee_id());

-- 4) leave_applications: self-read + self-insert
DROP POLICY IF EXISTS "Self can view own leave_applications" ON public.leave_applications;
CREATE POLICY "Self can view own leave_applications"
  ON public.leave_applications FOR SELECT
  TO authenticated
  USING (employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "Self can insert own leave_applications" ON public.leave_applications;
CREATE POLICY "Self can insert own leave_applications"
  ON public.leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() AND status = 'pending');

-- 5) leave_balances: self-read
DROP POLICY IF EXISTS "Self can view own leave_balances" ON public.leave_balances;
CREATE POLICY "Self can view own leave_balances"
  ON public.leave_balances FOR SELECT
  TO authenticated
  USING (employee_id = public.current_employee_id());

-- 6) payroll: self-read
DROP POLICY IF EXISTS "Self can view own payroll" ON public.payroll;
CREATE POLICY "Self can view own payroll"
  ON public.payroll FOR SELECT
  TO authenticated
  USING (employee_id = public.current_employee_id());

-- 7) app_roles: already viewable to all authenticated — no change needed
-- 8) leave_types: ensure self-read for displaying balance/application names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leave_types') THEN
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated can view leave_types" ON public.leave_types';
    EXECUTE 'CREATE POLICY "All authenticated can view leave_types" ON public.leave_types FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
