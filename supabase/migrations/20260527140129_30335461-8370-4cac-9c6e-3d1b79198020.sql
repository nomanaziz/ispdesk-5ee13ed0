UPDATE public.app_role_modules
SET enabled = false,
    permission = 'none'::public.perm_level
WHERE role_id = '33333333-3333-3333-3333-333333333333'
  AND module_group <> 'EMPLOYEE_SELF_SERVICE';

UPDATE public.app_role_modules
SET enabled = true,
    permission = 'read'::public.perm_level
WHERE role_id = '33333333-3333-3333-3333-333333333333'
  AND module_group = 'EMPLOYEE_SELF_SERVICE'
  AND module_name <> 'Catering Service';

UPDATE public.app_role_modules
SET enabled = false,
    permission = 'none'::public.perm_level
WHERE role_id = '33333333-3333-3333-3333-333333333333'
  AND module_group = 'EMPLOYEE_SELF_SERVICE'
  AND module_name = 'Catering Service';