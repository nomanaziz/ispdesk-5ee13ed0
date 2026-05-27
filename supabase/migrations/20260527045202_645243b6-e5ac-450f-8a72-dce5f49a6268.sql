
-- Seed default payheads needed for the default Monthly Payroll
INSERT INTO public.payheads (name, type, amount, is_percentage, status)
SELECT v.name, v.type, 0, false, 'active'
FROM (VALUES
  ('Basic Salary', 'allowance'),
  ('House Rent', 'allowance'),
  ('Conveyance Allowance', 'allowance'),
  ('Medical Allowance', 'allowance'),
  ('Bonus', 'allowance'),
  ('Food Allowance', 'allowance'),
  ('Increment', 'allowance'),
  ('Early Out', 'deduction')
) AS v(name, type)
WHERE NOT EXISTS (SELECT 1 FROM public.payheads p WHERE lower(p.name) = lower(v.name));

-- Ensure a default Monthly Payroll template exists
INSERT INTO public.payroll_templates (name, payroll_type, is_default, status)
SELECT 'Monthly Payroll', 'Monthly', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.payroll_templates WHERE is_default = true);

-- Wipe and re-seed default template's payheads with the percentage split
DO $$
DECLARE
  tpl uuid;
BEGIN
  SELECT id INTO tpl FROM public.payroll_templates WHERE is_default = true LIMIT 1;
  IF tpl IS NULL THEN RETURN; END IF;

  DELETE FROM public.payroll_template_payheads WHERE template_id = tpl;

  INSERT INTO public.payroll_template_payheads (template_id, payhead_id, amount_type, amount_value, final_amount)
  SELECT tpl, p.id, 'percentage', v.pct, v.pct
  FROM (VALUES
    ('Basic Salary', 50.0),
    ('House Rent', 37.5),
    ('Conveyance Allowance', 6.25),
    ('Medical Allowance', 6.25),
    ('Bonus', 0.0),
    ('Early Out', 0.0)
  ) AS v(name, pct)
  JOIN public.payheads p ON lower(p.name) = lower(v.name);
END $$;

-- Backfill: assign default template to employees that have none
UPDATE public.employees
SET payroll_template_id = (SELECT id FROM public.payroll_templates WHERE is_default = true LIMIT 1)
WHERE payroll_template_id IS NULL;
