INSERT INTO public.payheads (name, type, status)
SELECT v.name, v.type, 'active'
FROM (VALUES
  ('Basic Salary','allowance'),
  ('Late Fee','deduction'),
  ('Early Out','deduction'),
  ('Overtime','allowance'),
  ('Incentive','allowance'),
  ('Bonus','allowance'),
  ('Food Allowance','allowance'),
  ('Mobile Bill','allowance'),
  ('Salary Advance','deduction'),
  ('Absence','deduction')
) AS v(name,type)
WHERE NOT EXISTS (SELECT 1 FROM public.payheads p WHERE lower(p.name) = lower(v.name));