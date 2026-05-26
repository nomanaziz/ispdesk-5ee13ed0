
ALTER TABLE public.payroll
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS loan_deduction numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_deduction numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id uuid NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_from text,
  remarks text,
  sms_sent boolean NOT NULL DEFAULT false,
  branch_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_payments TO authenticated;
GRANT ALL ON public.payroll_payments TO service_role;
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read payroll_payments" ON public.payroll_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert payroll_payments" ON public.payroll_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update payroll_payments" ON public.payroll_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete payroll_payments" ON public.payroll_payments FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.advance_salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  adjusted_in_month text,
  branch_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_salary TO authenticated;
GRANT ALL ON public.advance_salary TO service_role;
ALTER TABLE public.advance_salary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read advance_salary" ON public.advance_salary FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert advance_salary" ON public.advance_salary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update advance_salary" ON public.advance_salary FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete advance_salary" ON public.advance_salary FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_advance_salary_updated BEFORE UPDATE ON public.advance_salary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  loan_amount numeric NOT NULL,
  installments integer NOT NULL,
  monthly_installment numeric NOT NULL,
  start_month text NOT NULL,
  remaining_balance numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  reason text,
  branch_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_loans TO authenticated;
GRANT ALL ON public.employee_loans TO service_role;
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read employee_loans" ON public.employee_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert employee_loans" ON public.employee_loans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update employee_loans" ON public.employee_loans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete employee_loans" ON public.employee_loans FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_employee_loans_updated BEFORE UPDATE ON public.employee_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.loan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric NOT NULL,
  payroll_id uuid REFERENCES public.payroll(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_installments TO authenticated;
GRANT ALL ON public.loan_installments TO service_role;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read loan_installments" ON public.loan_installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert loan_installments" ON public.loan_installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update loan_installments" ON public.loan_installments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete loan_installments" ON public.loan_installments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payroll_payments_payroll ON public.payroll_payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_advance_salary_employee ON public.advance_salary(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON public.employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan ON public.loan_installments(loan_id);
