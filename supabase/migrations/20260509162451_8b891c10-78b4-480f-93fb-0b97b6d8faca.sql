
-- =========================================================
-- Security hardening migration
-- Strategy: drop overly broad SELECT/ALL policies on sensitive tables
-- and replace with admin-only or admin-or-branch-scoped policies.
-- "Admins can manage X" policies (already admin-scoped) are preserved.
-- =========================================================

-- ---------- AFFILIATES ----------
DROP POLICY IF EXISTS "Authenticated can view affiliates" ON public.affiliates;
CREATE POLICY "Admins can view affiliates" ON public.affiliates
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- ATTENDANCE ----------
DROP POLICY IF EXISTS "Authenticated can view attendance" ON public.attendance;
CREATE POLICY "Admins can view attendance" ON public.attendance
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- BILL_COLLECTIONS ----------
DROP POLICY IF EXISTS "Authenticated users can view bill_collections" ON public.bill_collections;
DROP POLICY IF EXISTS "Authenticated users can insert bill_collections" ON public.bill_collections;
DROP POLICY IF EXISTS "Authenticated users can update bill_collections" ON public.bill_collections;
DROP POLICY IF EXISTS "Authenticated users can delete bill_collections" ON public.bill_collections;
CREATE POLICY "Admins manage bill_collections" ON public.bill_collections
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- BILLING ----------
DROP POLICY IF EXISTS "Authenticated can view billing" ON public.billing;
CREATE POLICY "Admins can view billing" ON public.billing
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- BILLING_HISTORY ----------
DROP POLICY IF EXISTS "Authenticated read billing_history" ON public.billing_history;
CREATE POLICY "Admins read billing_history" ON public.billing_history
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- POP_DAILY_CHARGES ----------
DROP POLICY IF EXISTS "Authenticated can view pop_daily_charges" ON public.pop_daily_charges;
DROP POLICY IF EXISTS "Authenticated read pop_daily_charges" ON public.pop_daily_charges;
DROP POLICY IF EXISTS "Authenticated users can view pop_daily_charges" ON public.pop_daily_charges;
CREATE POLICY "Admins view pop_daily_charges" ON public.pop_daily_charges
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- CLIENT_TRAFFIC_LOGS / MONTHLY ----------
DROP POLICY IF EXISTS "Authenticated users can view traffic logs" ON public.client_traffic_logs;
CREATE POLICY "Admins view traffic logs" ON public.client_traffic_logs
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view traffic monthly" ON public.client_traffic_monthly;
CREATE POLICY "Admins view traffic monthly" ON public.client_traffic_monthly
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- CUSTOMER_MESSAGES ----------
DROP POLICY IF EXISTS "Auth view customer_messages" ON public.customer_messages;
DROP POLICY IF EXISTS "Auth insert customer_messages" ON public.customer_messages;
CREATE POLICY "Admins manage customer_messages" ON public.customer_messages
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- EMPLOYEES ----------
DROP POLICY IF EXISTS "Authenticated can view employees" ON public.employees;
CREATE POLICY "Admins can view employees" ON public.employees
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- LEAVE_APPLICATIONS ----------
DROP POLICY IF EXISTS "Authenticated can view leave_applications" ON public.leave_applications;
CREATE POLICY "Admins view leave_applications" ON public.leave_applications
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- LEAVE_BALANCES ----------
DROP POLICY IF EXISTS "Authenticated users can manage leave_balances" ON public.leave_balances;
CREATE POLICY "Admins manage leave_balances" ON public.leave_balances
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- PAYROLL ----------
DROP POLICY IF EXISTS "Authenticated can view payroll" ON public.payroll;
CREATE POLICY "Admins can view payroll" ON public.payroll
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- PAYROLL_DETAILS ----------
DROP POLICY IF EXISTS "Authenticated can view payroll_details" ON public.payroll_details;
CREATE POLICY "Admins view payroll_details" ON public.payroll_details
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- SALARY_SHEETS ----------
DROP POLICY IF EXISTS "Authenticated can view salary_sheets" ON public.salary_sheets;
DROP POLICY IF EXISTS "Authenticated users can view salary_sheets" ON public.salary_sheets;
CREATE POLICY "Admins view salary_sheets" ON public.salary_sheets
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- ZKTECO_ATTENDANCE_LOGS ----------
DROP POLICY IF EXISTS "Authenticated can view zkteco_attendance_logs" ON public.zkteco_attendance_logs;
DROP POLICY IF EXISTS "Authenticated users can view zkteco_attendance_logs" ON public.zkteco_attendance_logs;
CREATE POLICY "Admins view zkteco_attendance_logs" ON public.zkteco_attendance_logs
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- ZKTECO_DEVICES ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='zkteco_devices'
  LOOP EXECUTE format('DROP POLICY %I ON public.zkteco_devices', r.policyname); END LOOP;
END $$;
CREATE POLICY "Admins manage zkteco_devices" ON public.zkteco_devices
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- SWITCHES ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='switches'
  LOOP EXECUTE format('DROP POLICY %I ON public.switches', r.policyname); END LOOP;
END $$;
CREATE POLICY "Admins manage switches" ON public.switches
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- SMS_LOG ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sms_log'
  LOOP EXECUTE format('DROP POLICY %I ON public.sms_log', r.policyname); END LOOP;
END $$;
CREATE POLICY "Admins manage sms_log" ON public.sms_log
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- SMS_TEMPLATE_OVERRIDES ----------
DROP POLICY IF EXISTS "Anyone can view overrides" ON public.sms_template_overrides;
CREATE POLICY "Authenticated view sms overrides" ON public.sms_template_overrides
  FOR SELECT TO authenticated USING (true);

-- ---------- SMS_TEMPLATE_MASTER ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sms_template_master' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.sms_template_master', r.policyname); END LOOP;
END $$;
CREATE POLICY "Authenticated view sms templates" ON public.sms_template_master
  FOR SELECT TO authenticated USING (true);

-- ---------- POP_BILLING_PERIODS ----------
DROP POLICY IF EXISTS "Anyone can view pop billing periods" ON public.pop_billing_periods;
CREATE POLICY "Authenticated view pop billing periods" ON public.pop_billing_periods
  FOR SELECT TO authenticated USING (true);

-- ---------- POP_DISTRICT_ASSIGNMENTS ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pop_district_assignments' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.pop_district_assignments', r.policyname); END LOOP;
END $$;
CREATE POLICY "Authenticated view pop district assignments" ON public.pop_district_assignments
  FOR SELECT TO authenticated USING (true);

-- ---------- RESELLER_SUBSCRIPTIONS ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='reseller_subscriptions' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.reseller_subscriptions', r.policyname); END LOOP;
END $$;
CREATE POLICY "Admins view reseller_subscriptions" ON public.reseller_subscriptions
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- PUBLIC_PAYMENT_REQUESTS ----------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='public_payment_requests' AND cmd IN ('UPDATE','DELETE','ALL')
  LOOP EXECUTE format('DROP POLICY %I ON public.public_payment_requests', r.policyname); END LOOP;
END $$;
CREATE POLICY "Admins update public_payment_requests" ON public.public_payment_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins delete public_payment_requests" ON public.public_payment_requests
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- ---------- CLIENTS — column-level mask for password & nid_number ----------
-- Drop the existing branch-scoped SELECT policy and recreate it (kept as-is),
-- then revoke broad column SELECT and re-grant non-sensitive columns to authenticated.
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clients'
      AND column_name NOT IN ('password', 'nid_number');

  -- Authenticated role: column-restricted SELECT (RLS row-filter still applies)
  EXECUTE 'REVOKE SELECT ON public.clients FROM authenticated';
  EXECUTE 'GRANT SELECT (' || v_cols || ') ON public.clients TO authenticated';
  -- service_role retains full access
  EXECUTE 'GRANT SELECT ON public.clients TO service_role';
END $$;
