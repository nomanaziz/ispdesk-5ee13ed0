
-- Payroll templates (named payroll configs)
CREATE TABLE public.payroll_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payroll_templates" ON public.payroll_templates FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view payroll_templates" ON public.payroll_templates FOR SELECT TO authenticated USING (true);

-- Payroll template payhead assignments
CREATE TABLE public.payroll_template_payheads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.payroll_templates(id) ON DELETE CASCADE,
  payhead_id uuid NOT NULL REFERENCES public.payheads(id) ON DELETE CASCADE,
  amount_value numeric NOT NULL DEFAULT 0,
  amount_type text NOT NULL DEFAULT 'amount',
  final_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, payhead_id)
);
ALTER TABLE public.payroll_template_payheads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payroll_template_payheads" ON public.payroll_template_payheads FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view payroll_template_payheads" ON public.payroll_template_payheads FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_ptp_template ON public.payroll_template_payheads(template_id);
