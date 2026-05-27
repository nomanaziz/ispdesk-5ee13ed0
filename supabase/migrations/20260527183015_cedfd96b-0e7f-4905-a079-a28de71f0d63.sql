INSERT INTO public.app_roles (name, status, is_protected, is_default)
SELECT 'HR', 'active', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.app_roles WHERE lower(name)='hr');

WITH hr_role AS (SELECT id FROM public.app_roles WHERE lower(name)='hr' LIMIT 1),
modules(g,n) AS (VALUES
  ('HR_PAYROLL','Payroll'),
  ('HR_PAYROLL','Payslip'),
  ('HR_PAYROLL','Employees'),
  ('HR_PAYROLL','Salary Sheet'),
  ('HR_PAYROLL','Attendance'),
  ('HR_PAYROLL','Departments'),
  ('HR_PAYROLL','Positions'),
  ('HR_PAYROLL','Leave Management'),
  ('HR_PAYROLL','Advance Salary'),
  ('HR_PAYROLL','Employee Loans'),
  ('HR_PAYROLL','Resignations'),
  ('HR_PAYROLL','Conveyance Bills'),
  ('HR_PAYROLL','Catering'),
  ('HR_PAYROLL','Employee Hub'),
  ('HR_PAYROLL','Profile Approvals'),
  ('HR_PAYROLL','HR Settings')
)
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT (SELECT id FROM hr_role), m.g, m.n, true, 'full'
FROM modules m
WHERE EXISTS (SELECT 1 FROM hr_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_modules x
    WHERE x.role_id = (SELECT id FROM hr_role)
      AND x.module_group = m.g AND x.module_name = m.n
  );