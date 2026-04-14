
-- 1. Attendance table
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in time WITHOUT TIME ZONE,
  check_out time WITHOUT TIME ZONE,
  status text NOT NULL DEFAULT 'present',
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);

-- 2. Rejoin requests table
CREATE TABLE public.rejoin_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  resignation_id uuid REFERENCES public.resignations(id) ON DELETE SET NULL,
  rejoin_date date NOT NULL,
  new_salary numeric DEFAULT 0,
  new_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  new_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  remarks text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rejoin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rejoin_requests" ON public.rejoin_requests FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view rejoin_requests" ON public.rejoin_requests FOR SELECT TO authenticated USING (true);

-- 3. Payroll details table
CREATE TABLE public.payroll_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_id uuid NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  payhead_id uuid NOT NULL REFERENCES public.payheads(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payroll_details" ON public.payroll_details FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view payroll_details" ON public.payroll_details FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_payroll_details_payroll_id ON public.payroll_details(payroll_id);

-- 4. Salary sheets table
CREATE TABLE public.salary_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month date NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_salary numeric DEFAULT 0,
  total_allowance numeric DEFAULT 0,
  total_deduction numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month)
);

ALTER TABLE public.salary_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salary_sheets" ON public.salary_sheets FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view salary_sheets" ON public.salary_sheets FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_salary_sheets_month ON public.salary_sheets(month);
