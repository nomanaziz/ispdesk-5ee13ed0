
ALTER TABLE public.payroll_templates
  ADD COLUMN IF NOT EXISTS payroll_type text,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id uuid NOT NULL REFERENCES public.payroll_templates(id) ON DELETE CASCADE,
  period_type text NOT NULL,
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  issue_date date NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read payroll_periods" ON public.payroll_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert payroll_periods" ON public.payroll_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update payroll_periods" ON public.payroll_periods FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete payroll_periods" ON public.payroll_periods FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_payroll ON public.payroll_periods(payroll_id);

-- Seed: default Monthly Payroll if none exists
INSERT INTO public.payroll_templates (name, payroll_type, is_default, status)
SELECT 'Monthly Payroll', 'Monthly', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.payroll_templates WHERE is_default = true);

-- Assign all active payheads to that default payroll with amount=0
INSERT INTO public.payroll_template_payheads (template_id, payhead_id, amount_value, amount_type, final_amount)
SELECT t.id, p.id, 0, 'amount', 0
FROM public.payroll_templates t
CROSS JOIN public.payheads p
WHERE t.is_default = true
  AND p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.payroll_template_payheads x
    WHERE x.template_id = t.id AND x.payhead_id = p.id
  );
