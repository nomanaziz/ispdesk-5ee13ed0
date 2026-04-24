
-- Insert 4 new pre-defined roles (idempotent: skip if name already exists)
INSERT INTO public.app_roles (name, status, redirect_url, is_protected, is_default)
SELECT v.name, 'Active', '/dashboard', false, false
FROM (VALUES
  ('Support Engineer'),
  ('Accountant'),
  ('Technician'),
  ('Transmission Engineer')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_roles ar WHERE ar.name = v.name
);

-- Seed module rows for each new role: copy ALL distinct (module_group, module_name) from
-- the Admin role's modules, default enabled=false / permission='view'.
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT r.id, m.module_group, m.module_name, false, 'view'
FROM public.app_roles r
CROSS JOIN (
  SELECT DISTINCT module_group, module_name FROM public.app_role_modules
) m
WHERE r.name IN ('Support Engineer','Accountant','Technician','Transmission Engineer')
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_modules arm
    WHERE arm.role_id = r.id
      AND arm.module_group = m.module_group
      AND arm.module_name = m.module_name
  );

-- ============================================================
-- 1) SUPPORT ENGINEER — client/ticket/monitoring focus
-- ============================================================
WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Support Engineer')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'edit'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('DASHBOARD','Dashboard'),
    ('CLIENTS','Client List'), ('CLIENTS','Add Client'),
    ('CLIENTS','Portal Manage'), ('CLIENTS','Scheduler'),
    ('MONITORING','Online Clients'), ('MONITORING','Live Traffic'), ('MONITORING','POP Devices'),
    ('BW_SALE','Customers'), ('BW_SALE','Invoices'), ('BW_SALE','Collections'),
    ('BILLING','Client Profile'), ('BILLING','Billing List'),
    ('COMMON_PERMISSIONS','Create'), ('COMMON_PERMISSIONS','Edit'),
    ('COMMON_PERMISSIONS','View'), ('COMMON_PERMISSIONS','Print')
  );

WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Support Engineer')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'view'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('REPORTS','Customer'), ('REPORTS','Bill Collection'), ('REPORTS','Messages'),
    ('NETWORK','Map'), ('NETWORK','Diagram'), ('NETWORK','Connections'),
    ('OLT','ONU List'), ('OLT','Users'),
    ('HR_PAYROLL','Employees')
  );

-- ============================================================
-- 2) ACCOUNTANT — billing/accounting focus
-- ============================================================
WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Accountant')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'edit'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('DASHBOARD','Dashboard'),
    ('ACCOUNTING','Cash Book'), ('ACCOUNTING','Journal'),
    ('ACCOUNTING','Income'), ('ACCOUNTING','Expense'),
    ('ACCOUNTING','Chart of Accounts'), ('ACCOUNTING','Balance Sheet'),
    ('ACCOUNTING','Profit & Loss'), ('ACCOUNTING','Trial Balance'),
    ('BILLING','Billing List'), ('BILLING','Daily Collection'), ('BILLING','Client Profile'),
    ('BW_SALE','Invoices'), ('BW_SALE','Collections'), ('BW_SALE','Recurring'),
    ('BW_BUY','Bills'), ('BW_BUY','Subscriptions'),
    ('SALES','Installation Fee'), ('SALES','Product Invoice'), ('SALES','Service Invoice'),
    ('PURCHASES','Bills'), ('PURCHASES','Purchases'),
    ('PURCHASES','Vendors'), ('PURCHASES','Requisitions'),
    ('BRANCHES','Funding'), ('BRANCHES','PGW Payments'), ('BRANCHES','PGW Settlement'),
    ('COMMON_PERMISSIONS','Create'), ('COMMON_PERMISSIONS','Edit'),
    ('COMMON_PERMISSIONS','View'), ('COMMON_PERMISSIONS','Print'),
    ('COMMON_PERMISSIONS','Export')
  );

WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Accountant')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'view'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('REPORTS','Bill Collection'), ('REPORTS','Financial'),
    ('REPORTS','Discount'), ('REPORTS','Processing Fee'),
    ('REPORTS','BTRC'), ('REPORTS','Customer'),
    ('CLIENTS','Client List'),
    ('SHOP','Sales Report'), ('SHOP','Orders')
  );

-- ============================================================
-- 3) TECHNICIAN — install/repair/ticket solving
-- ============================================================
WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Technician')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'edit'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('DASHBOARD','Dashboard'),
    ('CLIENTS','Add Client'), ('CLIENTS','Client List'), ('CLIENTS','Scheduler'),
    ('MONITORING','Online Clients'), ('MONITORING','POP Devices'),
    ('NETWORK','Map'), ('NETWORK','Connections'), ('NETWORK','POP'),
    ('OLT','ONU List'), ('OLT','Users'),
    ('INVENTORY','Items'), ('INVENTORY','Stock'),
    ('COMMON_PERMISSIONS','Create'), ('COMMON_PERMISSIONS','Edit'), ('COMMON_PERMISSIONS','View')
  );

WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Technician')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'view'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('BILLING','Client Profile'),
    ('NETWORK','Diagram'),
    ('MIKROTIK','Servers'),
    ('HR_PAYROLL','Attendance')
  );

-- ============================================================
-- 4) TRANSMISSION ENGINEER — backbone/OLT/MikroTik
-- ============================================================
WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Transmission Engineer')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'edit'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('DASHBOARD','Dashboard'),
    ('MONITORING','Live Traffic'), ('MONITORING','POP Devices'), ('MONITORING','Online Clients'),
    ('NETWORK','POP'), ('NETWORK','Map'), ('NETWORK','Diagram'), ('NETWORK','Connections'),
    ('OLT','Devices'), ('OLT','ONU List'), ('OLT','Sharing'), ('OLT','Users'),
    ('MIKROTIK','Servers'), ('MIKROTIK','Backup'), ('MIKROTIK','Import'),
    ('BW_BUY','Providers'), ('BW_BUY','Subscriptions'),
    ('COMMON_PERMISSIONS','Create'), ('COMMON_PERMISSIONS','Edit'), ('COMMON_PERMISSIONS','View')
  );

WITH r AS (SELECT id FROM public.app_roles WHERE name = 'Transmission Engineer')
UPDATE public.app_role_modules arm
SET enabled = true, permission = 'view'
FROM r
WHERE arm.role_id = r.id
  AND (arm.module_group, arm.module_name) IN (
    ('CLIENTS','Client List'),
    ('BILLING','Client Profile'),
    ('REPORTS','BTRC')
  );
