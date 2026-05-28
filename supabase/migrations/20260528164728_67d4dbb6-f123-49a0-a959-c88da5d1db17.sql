INSERT INTO public.app_role_modules (role_id, module_group, module_name, permission, enabled)
SELECT r.id, t.g, t.n, 'full', (r.name IN ('Super Admin','Admin'))
FROM public.app_roles r
CROSS JOIN (VALUES
  ('SYSTEM','Custom Domain'),
  ('SYSTEM','Automatic Process'),
  ('SYSTEM','My Subscription'),
  ('SYSTEM','Bill Period Years'),
  ('CLIENTS','Home Clients'),
  ('CLIENTS','Corporate Clients'),
  ('CLIENTS','New Request'),
  ('CLIENTS','Left Clients'),
  ('CLIENTS','Change Request'),
  ('CLIENTS','Update Requests'),
  ('BILLING','Cycle Settings'),
  ('BILLING','Installation Fee')
) AS t(g,n)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_role_modules x
  WHERE x.role_id = r.id AND x.module_group = t.g AND x.module_name = t.n
);