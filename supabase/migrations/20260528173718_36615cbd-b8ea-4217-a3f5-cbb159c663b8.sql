-- 1) Mirror legacy BILLING/SALES permissions into the CLIENTS group so the
--    sidebar/role permission editor uses a single hierarchy that matches the
--    visible menu.

-- Seed new CLIENTS rows for every role (default disabled). Existing rows are
-- left alone via ON CONFLICT.
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT r.id, t.g, t.n, false, 'read'
FROM public.app_roles r
CROSS JOIN (VALUES
  ('CLIENTS','Billing List'),
  ('CLIENTS','Daily Collection'),
  ('CLIENTS','Installation Fee'),
  ('SYSTEM','Billing Cycle Settings')
) AS t(g,n)
ON CONFLICT (role_id, module_group, module_name) DO NOTHING;

-- Copy existing enabled/permission values from the legacy rows so roles that
-- already had Billing/Daily Collection/Installation Fee access keep it.
UPDATE public.app_role_modules tgt
SET enabled = src.enabled, permission = src.permission
FROM public.app_role_modules src
WHERE src.role_id = tgt.role_id
  AND (
    (src.module_group = 'BILLING' AND src.module_name = 'Billing List'      AND tgt.module_group = 'CLIENTS' AND tgt.module_name = 'Billing List')
    OR (src.module_group = 'BILLING' AND src.module_name = 'Daily Collection' AND tgt.module_group = 'CLIENTS' AND tgt.module_name = 'Daily Collection')
    OR (src.module_group = 'BILLING' AND src.module_name = 'Installation Fee' AND tgt.module_group = 'CLIENTS' AND tgt.module_name = 'Installation Fee')
    OR (src.module_group = 'SALES'   AND src.module_name = 'Installation Fee' AND tgt.module_group = 'CLIENTS' AND tgt.module_name = 'Installation Fee')
    OR (src.module_group = 'BILLING' AND src.module_name = 'Cycle Settings'   AND tgt.module_group = 'SYSTEM'  AND tgt.module_name = 'Billing Cycle Settings')
  );

-- 2) Make sure Super Admin / Admin keep full access to the new rows.
UPDATE public.app_role_modules
SET enabled = true, permission = 'full'
WHERE role_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
) AND (
  (module_group = 'CLIENTS' AND module_name IN ('Billing List','Daily Collection','Installation Fee'))
  OR (module_group = 'SYSTEM' AND module_name = 'Billing Cycle Settings')
);

-- 3) Remove the legacy duplicate rows so the role permission editor no longer
--    shows a separate BILLING/SALES group for the same menu items.
DELETE FROM public.app_role_modules
WHERE (module_group = 'BILLING' AND module_name IN ('Billing List','Daily Collection','Installation Fee','Cycle Settings','Client Profile'))
   OR (module_group = 'SALES'   AND module_name = 'Installation Fee');

-- 4) Relax billing / bill_collections / income_entries RLS so staff with the
--    appropriate CLIENTS menu permission can read and write.
DROP POLICY IF EXISTS "Admins can view billing" ON public.billing;
DROP POLICY IF EXISTS "Admins can manage billing" ON public.billing;
DROP POLICY IF EXISTS "Staff view billing with permission" ON public.billing;
DROP POLICY IF EXISTS "Staff manage billing with permission" ON public.billing;

CREATE POLICY "Staff view billing with permission"
  ON public.billing FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'read')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'read')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Client List', 'read')
  );

CREATE POLICY "Staff manage billing with permission"
  ON public.billing FOR ALL TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'write')
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'write')
  );

DROP POLICY IF EXISTS "Admins manage bill_collections" ON public.bill_collections;
DROP POLICY IF EXISTS "Staff manage bill_collections with permission" ON public.bill_collections;

CREATE POLICY "Staff manage bill_collections with permission"
  ON public.bill_collections FOR ALL TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'read')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'read')
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'write')
  );

DROP POLICY IF EXISTS "Authenticated can view income_entries" ON public.income_entries;
DROP POLICY IF EXISTS "Admins can manage income_entries" ON public.income_entries;
DROP POLICY IF EXISTS "Staff view income_entries with permission" ON public.income_entries;
DROP POLICY IF EXISTS "Staff manage income_entries with permission" ON public.income_entries;

CREATE POLICY "Staff view income_entries with permission"
  ON public.income_entries FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'read')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'read')
    OR public.user_has_module(auth.uid(), 'ACCOUNTING', 'Income', 'read')
  );

CREATE POLICY "Staff manage income_entries with permission"
  ON public.income_entries FOR ALL TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'write')
    OR public.user_has_module(auth.uid(), 'ACCOUNTING', 'Income', 'write')
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Billing List', 'write')
    OR public.user_has_module(auth.uid(), 'CLIENTS', 'Daily Collection', 'write')
    OR public.user_has_module(auth.uid(), 'ACCOUNTING', 'Income', 'write')
  );