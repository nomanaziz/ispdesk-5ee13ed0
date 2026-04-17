
-- Add protection columns
ALTER TABLE public.app_roles
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;

-- Seed 3 default roles (idempotent via fixed UUIDs)
INSERT INTO public.app_roles (id, name, status, is_default, is_protected)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Super Admin', 'Active', true, true),
  ('22222222-2222-2222-2222-222222222222', 'Admin',       'Active', true, true),
  ('33333333-3333-3333-3333-333333333333', 'Employee',    'Active', true, true)
ON CONFLICT (id) DO UPDATE
  SET is_default = EXCLUDED.is_default,
      is_protected = EXCLUDED.is_protected,
      status = EXCLUDED.status;

-- Seed permissions for Super Admin: full access across common module groups
INSERT INTO public.app_role_modules (role_id, module_group, module_name, permission, enabled)
SELECT '11111111-1111-1111-1111-111111111111', g, m, 'full', true
FROM (VALUES
  ('DASHBOARD','Dashboard'),
  ('CLIENTS','Client List'),('CLIENTS','Add Client'),('CLIENTS','Portal Manage'),('CLIENTS','Scheduler'),
  ('BILLING','Billing List'),('BILLING','Daily Collection'),('BILLING','Client Profile'),
  ('BW_BUY','Providers'),('BW_BUY','Subscriptions'),('BW_BUY','Bills'),
  ('BW_SALE','Customers'),('BW_SALE','Invoices'),('BW_SALE','Collections'),('BW_SALE','Recurring'),
  ('NETWORK','POP'),('NETWORK','Connections'),('NETWORK','Map'),('NETWORK','Diagram'),
  ('MIKROTIK','Servers'),('MIKROTIK','Import'),('MIKROTIK','Backup'),
  ('OLT','Devices'),('OLT','ONU List'),('OLT','Sharing'),('OLT','Users'),
  ('MONITORING','Live Traffic'),('MONITORING','Online Clients'),('MONITORING','POP Devices'),
  ('HR_PAYROLL','Employees'),('HR_PAYROLL','Attendance'),('HR_PAYROLL','Payroll'),('HR_PAYROLL','Salary Sheet'),('HR_PAYROLL','Payslip'),('HR_PAYROLL','Departments'),('HR_PAYROLL','Positions'),
  ('LEAVE','Apply'),('LEAVE','Approval'),('LEAVE','Categories'),('LEAVE','Setup'),
  ('INVENTORY','Items'),('INVENTORY','Stock'),('INVENTORY','Categories'),('INVENTORY','Locations'),
  ('PURCHASES','Vendors'),('PURCHASES','Purchases'),('PURCHASES','Bills'),('PURCHASES','Requisitions'),
  ('SALES','Service Invoice'),('SALES','Product Invoice'),('SALES','Installation Fee'),
  ('ACCOUNTING','Chart of Accounts'),('ACCOUNTING','Journal'),('ACCOUNTING','Cash Book'),('ACCOUNTING','Trial Balance'),('ACCOUNTING','Profit & Loss'),('ACCOUNTING','Balance Sheet'),('ACCOUNTING','Income'),('ACCOUNTING','Expense'),
  ('ASSETS','Asset List'),('ASSETS','Destroyed'),
  ('REPORTS','Bill Collection'),('REPORTS','Discount'),('REPORTS','Customer'),('REPORTS','Due SMS'),('REPORTS','Messages'),('REPORTS','Processing Fee'),('REPORTS','BTRC'),('REPORTS','Financial'),
  ('SMS','Send'),('SMS','Templates'),('SMS','Gateway'),('SMS','Groups'),('SMS','Individual'),
  ('SUPPORT','Tickets'),('SUPPORT','History'),('SUPPORT','Categories'),
  ('TASKS','Tasks'),('TASKS','Categories'),('TASKS','History'),
  ('SHOP','Products'),('SHOP','Orders'),('SHOP','Categories'),('SHOP','Coupons'),('SHOP','Sales Report'),('SHOP','Warranty Claims'),('SHOP','Shipping Zones'),
  ('WEBSITE','Pages'),('WEBSITE','Menu'),('WEBSITE','Settings'),('WEBSITE','Notices'),('WEBSITE','Offers'),('WEBSITE','Services'),('WEBSITE','Features'),('WEBSITE','Partners'),('WEBSITE','Testimonials'),('WEBSITE','Festivals'),('WEBSITE','Media'),('WEBSITE','About'),('WEBSITE','Homepage'),
  ('VAS','Config'),('VAS','Subscriptions'),('VAS','Transactions'),
  ('BRANCHES','Managers'),('BRANCHES','Funding'),('BRANCHES','POP Profile'),('BRANCHES','POP Notice'),('BRANCHES','Tariff'),('BRANCHES','PGW Payments'),('BRANCHES','PGW Settlement'),
  ('CONFIG','Packages'),('CONFIG','Zones'),('CONFIG','Sub Zones'),('CONFIG','Boxes'),('CONFIG','Districts'),('CONFIG','Divisions'),('CONFIG','Upazilas'),('CONFIG','Client Types'),('CONFIG','Connection Types'),('CONFIG','Service Types'),('CONFIG','Protocol Types'),('CONFIG','Billing Statuses'),
  ('SYSTEM','Company'),('SYSTEM','Users'),('SYSTEM','Setup'),('SYSTEM','Email'),('SYSTEM','Invoice'),('SYSTEM','Periods'),('SYSTEM','System Log'),('SYSTEM','Payment Gateways'),('SYSTEM','Processing Fee'),('SYSTEM','OLT Permissions'),
  ('COMMON_PERMISSIONS','View'),('COMMON_PERMISSIONS','Create'),('COMMON_PERMISSIONS','Edit'),('COMMON_PERMISSIONS','Delete'),('COMMON_PERMISSIONS','Export'),('COMMON_PERMISSIONS','Print')
) AS t(g,m)
ON CONFLICT DO NOTHING;

-- Seed Admin: same as Super Admin EXCEPT Payment Gateways + OLT Permissions
INSERT INTO public.app_role_modules (role_id, module_group, module_name, permission, enabled)
SELECT '22222222-2222-2222-2222-222222222222', module_group, module_name, 'full', true
FROM public.app_role_modules
WHERE role_id = '11111111-1111-1111-1111-111111111111'
  AND NOT (module_group = 'SYSTEM' AND module_name IN ('Payment Gateways','OLT Permissions'))
ON CONFLICT DO NOTHING;

-- Seed Employee: only HR/Payroll self-service
INSERT INTO public.app_role_modules (role_id, module_group, module_name, permission, enabled)
VALUES
  ('33333333-3333-3333-3333-333333333333','HR_PAYROLL','Salary Sheet','read', true),
  ('33333333-3333-3333-3333-333333333333','HR_PAYROLL','Payslip','read', true),
  ('33333333-3333-3333-3333-333333333333','HR_PAYROLL','Attendance','read', true),
  ('33333333-3333-3333-3333-333333333333','LEAVE','Apply','full', true),
  ('33333333-3333-3333-3333-333333333333','DASHBOARD','Dashboard','read', true),
  ('33333333-3333-3333-3333-333333333333','COMMON_PERMISSIONS','View','full', true)
ON CONFLICT DO NOTHING;

-- RLS: protect default roles from edit/delete unless super_admin
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_roles select all authenticated" ON public.app_roles;
CREATE POLICY "app_roles select all authenticated"
  ON public.app_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "app_roles insert admin" ON public.app_roles;
CREATE POLICY "app_roles insert admin"
  ON public.app_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "app_roles update protected" ON public.app_roles;
CREATE POLICY "app_roles update protected"
  ON public.app_roles FOR UPDATE
  TO authenticated
  USING (
    (NOT is_protected AND public.is_admin_or_super(auth.uid()))
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "app_roles delete protected" ON public.app_roles;
CREATE POLICY "app_roles delete protected"
  ON public.app_roles FOR DELETE
  TO authenticated
  USING (
    (NOT is_protected AND public.is_admin_or_super(auth.uid()))
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- RLS on app_role_modules: same protection (cannot modify rows belonging to a protected role unless super_admin)
ALTER TABLE public.app_role_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arm select all authenticated" ON public.app_role_modules;
CREATE POLICY "arm select all authenticated"
  ON public.app_role_modules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "arm insert admin" ON public.app_role_modules;
CREATE POLICY "arm insert admin"
  ON public.app_role_modules FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.is_admin_or_super(auth.uid())
      AND NOT EXISTS (SELECT 1 FROM public.app_roles r WHERE r.id = role_id AND r.is_protected)
    )
  );

DROP POLICY IF EXISTS "arm update admin" ON public.app_role_modules;
CREATE POLICY "arm update admin"
  ON public.app_role_modules FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.is_admin_or_super(auth.uid())
      AND NOT EXISTS (SELECT 1 FROM public.app_roles r WHERE r.id = role_id AND r.is_protected)
    )
  );

DROP POLICY IF EXISTS "arm delete admin" ON public.app_role_modules;
CREATE POLICY "arm delete admin"
  ON public.app_role_modules FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.is_admin_or_super(auth.uid())
      AND NOT EXISTS (SELECT 1 FROM public.app_roles r WHERE r.id = role_id AND r.is_protected)
    )
  );
