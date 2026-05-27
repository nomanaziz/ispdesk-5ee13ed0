
WITH new_modules(module_name, employee_default) AS (
  VALUES
    ('My Profile', true),
    ('My Attendance', true),
    ('Daily Attendance Report', true),
    ('Monthly Attendance Report', true),
    ('My Leave Balance', true),
    ('Apply Leave', true),
    ('My Leave History', true),
    ('My Facilities', true),
    ('My Payslip', true),
    ('My Conveyance', true),
    ('Lunch Order', true),
    ('Catering Service', false)
)
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT r.id, 'EMPLOYEE_SELF_SERVICE', m.module_name,
  CASE
    WHEN r.name IN ('Super Admin','Admin') THEN true
    WHEN r.name = 'Employee' THEN m.employee_default
    ELSE false
  END,
  CASE
    WHEN r.name IN ('Super Admin','Admin') THEN 'manage'
    ELSE 'view'
  END
FROM public.app_roles r
CROSS JOIN new_modules m
ON CONFLICT (role_id, module_group, module_name) DO NOTHING;
