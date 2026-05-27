
-- Helper: get employee id linked to current auth user
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 1. dashboard_widget_permissions
CREATE TABLE public.dashboard_widget_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_user_id, widget_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_widget_permissions TO authenticated;
GRANT ALL ON public.dashboard_widget_permissions TO service_role;
ALTER TABLE public.dashboard_widget_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read widget perms" ON public.dashboard_widget_permissions FOR SELECT TO authenticated
  USING (app_user_id IN (SELECT id FROM public.app_users WHERE auth_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin manage widget perms" ON public.dashboard_widget_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 2. catering_services
CREATE TABLE public.catering_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catering_services TO authenticated;
GRANT ALL ON public.catering_services TO service_role;
ALTER TABLE public.catering_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read catering services" ON public.catering_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage catering services" ON public.catering_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3. catering_weekly_menu  (day_of_week 0=Sat ... 6=Fri, BD week)
CREATE TABLE public.catering_weekly_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.catering_services(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cutoff_time time DEFAULT '10:00',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catering_weekly_menu TO authenticated;
GRANT ALL ON public.catering_weekly_menu TO service_role;
ALTER TABLE public.catering_weekly_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read weekly menu" ON public.catering_weekly_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage weekly menu" ON public.catering_weekly_menu FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 4. meal_orders
CREATE TABLE public.meal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.catering_services(id),
  order_date date NOT NULL,
  menu_snapshot jsonb,
  price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ordered',
  deducted_in_payroll boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, order_date, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_orders TO authenticated;
GRANT ALL ON public.meal_orders TO service_role;
ALTER TABLE public.meal_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read meal orders" ON public.meal_orders FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "self insert meal orders" ON public.meal_orders FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "self update own meal orders" ON public.meal_orders FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin delete meal orders" ON public.meal_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 5. profile_change_requests
CREATE TABLE public.profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_change_requests TO authenticated;
GRANT ALL ON public.profile_change_requests TO service_role;
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read profile change" ON public.profile_change_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "self insert profile change" ON public.profile_change_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "admin update profile change" ON public.profile_change_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 6. salary_advance_requests
CREATE TABLE public.salary_advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_advance_requests TO authenticated;
GRANT ALL ON public.salary_advance_requests TO service_role;
ALTER TABLE public.salary_advance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read advance" ON public.salary_advance_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "self insert advance" ON public.salary_advance_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "admin update advance" ON public.salary_advance_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 7. loan_requests
CREATE TABLE public.loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  tenure_months int NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_requests TO authenticated;
GRANT ALL ON public.loan_requests TO service_role;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read loan" ON public.loan_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "self insert loan" ON public.loan_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "admin update loan" ON public.loan_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 8. resignation_requests
CREATE TABLE public.resignation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resignation_requests TO authenticated;
GRANT ALL ON public.resignation_requests TO service_role;
ALTER TABLE public.resignation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read resignation" ON public.resignation_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "self insert resignation" ON public.resignation_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "admin update resignation" ON public.resignation_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- updated_at triggers
CREATE TRIGGER trg_catering_services_updated BEFORE UPDATE ON public.catering_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_catering_weekly_menu_updated BEFORE UPDATE ON public.catering_weekly_menu
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meal_orders_updated BEFORE UPDATE ON public.meal_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profile_change_updated BEFORE UPDATE ON public.profile_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_salary_advance_updated BEFORE UPDATE ON public.salary_advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_loan_requests_updated BEFORE UPDATE ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_resignation_updated BEFORE UPDATE ON public.resignation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
