
-- Helper: drop ALL existing policies on a table, then recreate locked-down ones.

-- ============================================================
-- 1) BW financial tables: admin-only writes, keep reads as-is
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bw_bill_items','bw_buy_bill_items','bw_invoice_items',
    'bw_buy_provider_subscriptions','bw_buy_service_change_log',
    'bw_sale_services','bw_sale_recurring','reseller_tariffs',
    'bw_sale_collections','leave_policies',
    'reseller_pgw_payments','reseller_pgw_settlements'
  ]) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- BW billing/services/tariffs: authenticated can read; only admin can write
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bw_bill_items','bw_buy_bill_items','bw_invoice_items',
    'bw_buy_provider_subscriptions','bw_buy_service_change_log',
    'bw_sale_services','bw_sale_recurring','reseller_tariffs'
  ]) LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_select_auth', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()))', t||'_ins_admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()))', t||'_upd_admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()))', t||'_del_admin', t);
  END LOOP;
END $$;

-- bw_sale_collections: read all auth, write admin only
CREATE POLICY bw_sale_collections_select_auth ON public.bw_sale_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY bw_sale_collections_ins_admin ON public.bw_sale_collections FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY bw_sale_collections_upd_admin ON public.bw_sale_collections FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY bw_sale_collections_del_admin ON public.bw_sale_collections FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- leave_policies: read all auth, write admin only
CREATE POLICY leave_policies_select_auth ON public.leave_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY leave_policies_ins_admin ON public.leave_policies FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY leave_policies_upd_admin ON public.leave_policies FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY leave_policies_del_admin ON public.leave_policies FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- reseller_pgw_payments + settlements: admin only for everything
CREATE POLICY reseller_pgw_payments_admin_all ON public.reseller_pgw_payments FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY reseller_pgw_settlements_admin_all ON public.reseller_pgw_settlements FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 2) change_requests: admin-only read
-- ============================================================
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='change_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.change_requests', p.policyname);
  END LOOP;
END $$;
CREATE POLICY change_requests_select_admin ON public.change_requests FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY change_requests_ins_admin ON public.change_requests FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY change_requests_upd_admin ON public.change_requests FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY change_requests_del_admin ON public.change_requests FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 3) HR financial tables: admin-only, plus self-read where applicable
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'advance_salary','employee_loans','loan_installments','payroll_payments','payroll_periods','resignations'
  ]) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- advance_salary: admin all, employee self-read
CREATE POLICY advance_salary_admin_all ON public.advance_salary FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY advance_salary_self_read ON public.advance_salary FOR SELECT TO authenticated USING (employee_id = public.current_employee_id());

-- employee_loans: admin all, employee self-read
CREATE POLICY employee_loans_admin_all ON public.employee_loans FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY employee_loans_self_read ON public.employee_loans FOR SELECT TO authenticated USING (employee_id = public.current_employee_id());

-- loan_installments: admin only
CREATE POLICY loan_installments_admin_all ON public.loan_installments FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- payroll_payments: admin only
CREATE POLICY payroll_payments_admin_all ON public.payroll_payments FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- payroll_periods: admin only
CREATE POLICY payroll_periods_admin_all ON public.payroll_periods FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- resignations: admin or self
CREATE POLICY resignations_admin_all ON public.resignations FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY resignations_self_read ON public.resignations FOR SELECT TO authenticated USING (employee_id = public.current_employee_id());
