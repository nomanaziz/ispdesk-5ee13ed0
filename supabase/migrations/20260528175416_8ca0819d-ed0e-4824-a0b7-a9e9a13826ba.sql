
-- ============================================================================
-- 1. Chart of Accounts seed
-- ============================================================================
INSERT INTO public.chart_of_accounts (code, name, type, subtype, status)
SELECT v.code, v.name, v.type, v.subtype, 'active'
FROM (VALUES
  ('3000','Owner Capital','equity','capital'),
  ('3100','Partner Capital','equity','capital'),
  ('3200','Investor Capital','equity','capital'),
  ('3900','Owner Drawings','equity','drawings'),
  ('2100','Bank Loan','liability','loan'),
  ('2200','Private Loan','liability','loan'),
  ('5100','Interest Expense','expense','financial'),
  ('5110','Late Payment Fine','expense','financial'),
  ('4900','Other Business Income','income','other')
) AS v(code,name,type,subtype)
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts c WHERE c.code = v.code);

-- ============================================================================
-- 2. app_settings (or reuse system_settings) — guard flag
-- ============================================================================
INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'allow_negative_cash', 'false'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'allow_negative_cash');

-- ============================================================================
-- 3. capital_contributors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.capital_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('owner_capital','partner_capital','investor','bank_loan','private_loan','other_income')),
  name text NOT NULL,
  phone text,
  address text,
  identifier text,
  agreed_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  interest_rate_pct numeric NOT NULL DEFAULT 0,
  interest_type text NOT NULL DEFAULT 'none' CHECK (interest_type IN ('none','flat','reducing','profit_share')),
  installment_amount numeric NOT NULL DEFAULT 0,
  installment_cycle text NOT NULL DEFAULT 'one_time' CHECK (installment_cycle IN ('one_time','monthly','quarterly','yearly','flexible')),
  total_installments integer NOT NULL DEFAULT 0,
  late_fine_rule jsonb NOT NULL DEFAULT '{"type":"none","value":0,"grace_days":0}'::jsonb,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  branch_id uuid,
  linked_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_contributors TO authenticated;
GRANT ALL ON public.capital_contributors TO service_role;
ALTER TABLE public.capital_contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_read_auth" ON public.capital_contributors FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc_admin_write" ON public.capital_contributors FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================================
-- 4. capital_transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.capital_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.capital_contributors(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  category text NOT NULL CHECK (category IN ('principal_in','principal_repay','interest_pay','profit_share','late_fine','drawing','other')),
  amount numeric NOT NULL CHECK (amount >= 0),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  description text,
  branch_id uuid,
  linked_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  schedule_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_tx_contrib ON public.capital_transactions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_capital_tx_date ON public.capital_transactions(transaction_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_transactions TO authenticated;
GRANT ALL ON public.capital_transactions TO service_role;
ALTER TABLE public.capital_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_read_auth" ON public.capital_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ct_admin_write" ON public.capital_transactions FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================================
-- 5. capital_installment_schedule
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.capital_installment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.capital_contributors(id) ON DELETE CASCADE,
  installment_no integer NOT NULL,
  due_date date NOT NULL,
  principal_due numeric NOT NULL DEFAULT 0,
  interest_due numeric NOT NULL DEFAULT 0,
  total_due numeric GENERATED ALWAYS AS (principal_due + interest_due) STORED,
  paid_amount numeric NOT NULL DEFAULT 0,
  fine_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contributor_id, installment_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_installment_schedule TO authenticated;
GRANT ALL ON public.capital_installment_schedule TO service_role;
ALTER TABLE public.capital_installment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cis_read_auth" ON public.capital_installment_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "cis_admin_write" ON public.capital_installment_schedule FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================================
-- 6. get_cash_on_hand function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cash_on_hand(_as_of date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit numeric := 0;
  v_credit numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_debit FROM public.bill_collections WHERE created_at::date <= _as_of;
  v_debit := v_debit + COALESCE((SELECT SUM(paid) FROM public.installation_fees WHERE fee_date <= _as_of), 0);
  v_debit := v_debit + COALESCE((SELECT SUM(paid_amount) FROM public.service_invoices WHERE issued_date <= _as_of), 0);
  v_debit := v_debit + COALESCE((SELECT SUM(paid_amount) FROM public.product_invoices WHERE issued_date <= _as_of), 0);
  v_debit := v_debit + COALESCE((SELECT SUM(paid_amount) FROM public.bw_sales_invoices WHERE issued_date <= _as_of), 0);
  v_debit := v_debit + COALESCE((SELECT SUM(amount) FROM public.income_entries WHERE income_date <= _as_of), 0);
  v_debit := v_debit + COALESCE((SELECT SUM(amount) FROM public.capital_transactions WHERE direction='in' AND transaction_date <= _as_of), 0);

  v_credit := COALESCE((SELECT SUM(net_salary) FROM public.payroll WHERE status='paid' AND paid_at::date <= _as_of), 0);
  v_credit := v_credit + COALESCE((SELECT SUM(amount) FROM public.expense_entries WHERE expense_date <= _as_of), 0);
  v_credit := v_credit + COALESCE((SELECT SUM(paid) FROM public.bw_purchase_bills WHERE created_at::date <= _as_of), 0);
  v_credit := v_credit + COALESCE((SELECT SUM(paid_amount) FROM public.purchase_bills WHERE issued_date <= _as_of), 0);
  v_credit := v_credit + COALESCE((SELECT SUM(amount) FROM public.capital_transactions WHERE direction='out' AND transaction_date <= _as_of), 0);

  RETURN v_debit - v_credit;
END;
$$;

-- ============================================================================
-- 7. enforce_cash_on_hand trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_cash_on_hand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow boolean := false;
  v_projected numeric;
  v_outflow numeric := 0;
BEGIN
  SELECT COALESCE((setting_value)::text::boolean, false) INTO v_allow
    FROM public.system_settings WHERE setting_key='allow_negative_cash';
  IF v_allow THEN RETURN NEW; END IF;

  -- Compute the new outflow this row introduces
  IF TG_TABLE_NAME = 'expense_entries' THEN
    v_outflow := COALESCE(NEW.amount,0) - COALESCE(OLD.amount,0);
  ELSIF TG_TABLE_NAME = 'capital_transactions' THEN
    IF NEW.direction <> 'out' THEN RETURN NEW; END IF;
    v_outflow := COALESCE(NEW.amount,0) - COALESCE(OLD.amount,0);
  ELSIF TG_TABLE_NAME = 'payroll' THEN
    IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
    IF COALESCE(OLD.status,'') = 'paid' THEN RETURN NEW; END IF;
    v_outflow := COALESCE(NEW.net_salary,0);
  ELSIF TG_TABLE_NAME = 'bw_purchase_bills' THEN
    v_outflow := COALESCE(NEW.paid,0) - COALESCE(OLD.paid,0);
  ELSIF TG_TABLE_NAME = 'purchase_bills' THEN
    v_outflow := COALESCE(NEW.paid_amount,0) - COALESCE(OLD.paid_amount,0);
  END IF;

  IF v_outflow <= 0 THEN RETURN NEW; END IF;

  v_projected := public.get_cash_on_hand(CURRENT_DATE) - v_outflow;
  IF v_projected < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CASH: Cash on hand অপ্রতুল। বর্তমান ৳%, প্রয়োজন আরো ৳%. আগে fund add করুন।',
      public.get_cash_on_hand(CURRENT_DATE), (v_outflow - public.get_cash_on_hand(CURRENT_DATE))
      USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cash_expense ON public.expense_entries;
CREATE TRIGGER trg_enforce_cash_expense
  BEFORE INSERT OR UPDATE ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_on_hand();

DROP TRIGGER IF EXISTS trg_enforce_cash_capital_out ON public.capital_transactions;
CREATE TRIGGER trg_enforce_cash_capital_out
  BEFORE INSERT OR UPDATE ON public.capital_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_on_hand();

DROP TRIGGER IF EXISTS trg_enforce_cash_payroll ON public.payroll;
CREATE TRIGGER trg_enforce_cash_payroll
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_on_hand();

DROP TRIGGER IF EXISTS trg_enforce_cash_bwpurchase ON public.bw_purchase_bills;
CREATE TRIGGER trg_enforce_cash_bwpurchase
  BEFORE INSERT OR UPDATE ON public.bw_purchase_bills
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_on_hand();

DROP TRIGGER IF EXISTS trg_enforce_cash_purchase ON public.purchase_bills;
CREATE TRIGGER trg_enforce_cash_purchase
  BEFORE INSERT OR UPDATE ON public.purchase_bills
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_on_hand();

-- ============================================================================
-- 8. generate_installment_schedule
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_installment_schedule(_contributor_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  i integer;
  v_count integer := 0;
  v_due_date date;
  v_principal_per numeric;
  v_interest_per numeric;
  v_remaining_principal numeric;
  v_monthly_rate numeric;
BEGIN
  SELECT * INTO c FROM public.capital_contributors WHERE id = _contributor_id;
  IF c.id IS NULL OR c.installment_cycle NOT IN ('monthly','quarterly','yearly') OR c.total_installments <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM public.capital_installment_schedule
   WHERE contributor_id = _contributor_id AND status='pending' AND paid_amount=0;

  v_principal_per := CASE WHEN c.total_installments > 0 THEN c.agreed_amount / c.total_installments ELSE 0 END;
  v_remaining_principal := c.agreed_amount;
  v_monthly_rate := COALESCE(c.interest_rate_pct,0) / 100.0 / 12.0;

  FOR i IN 1..c.total_installments LOOP
    v_due_date := c.start_date + (CASE c.installment_cycle
        WHEN 'monthly' THEN (i || ' month')::interval
        WHEN 'quarterly' THEN (i*3 || ' month')::interval
        WHEN 'yearly' THEN (i || ' year')::interval END);

    v_interest_per := CASE
      WHEN c.interest_type='reducing' THEN v_remaining_principal * v_monthly_rate
      WHEN c.interest_type='flat' THEN c.agreed_amount * COALESCE(c.interest_rate_pct,0)/100.0 / c.total_installments
      ELSE 0
    END;

    INSERT INTO public.capital_installment_schedule
      (contributor_id, installment_no, due_date, principal_due, interest_due)
    VALUES (_contributor_id, i, v_due_date::date, v_principal_per, v_interest_per)
    ON CONFLICT (contributor_id, installment_no) DO UPDATE
      SET due_date = EXCLUDED.due_date,
          principal_due = EXCLUDED.principal_due,
          interest_due = EXCLUDED.interest_due,
          updated_at = now();

    v_remaining_principal := v_remaining_principal - v_principal_per;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generate_schedule_on_contributor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.generate_installment_schedule(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_capital_contrib_schedule ON public.capital_contributors;
CREATE TRIGGER trg_capital_contrib_schedule
  AFTER INSERT OR UPDATE OF agreed_amount, total_installments, installment_cycle, interest_rate_pct, interest_type, start_date
  ON public.capital_contributors
  FOR EACH ROW EXECUTE FUNCTION public.trg_generate_schedule_on_contributor();

-- ============================================================================
-- 9. update_capital_installments_daily (overdue + fine)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_capital_installments_daily()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
  v_grace int;
  v_fine_type text;
  v_fine_val numeric;
  v_fine numeric;
BEGIN
  FOR r IN
    SELECT s.id, s.contributor_id, s.due_date, s.total_due, s.paid_amount, c.late_fine_rule
    FROM public.capital_installment_schedule s
    JOIN public.capital_contributors c ON c.id = s.contributor_id
    WHERE s.status IN ('pending','partial')
      AND s.due_date < CURRENT_DATE
  LOOP
    v_grace := COALESCE((r.late_fine_rule->>'grace_days')::int, 0);
    IF CURRENT_DATE - r.due_date <= v_grace THEN CONTINUE; END IF;
    v_fine_type := COALESCE(r.late_fine_rule->>'type','none');
    v_fine_val := COALESCE((r.late_fine_rule->>'value')::numeric, 0);
    v_fine := CASE v_fine_type
      WHEN 'fixed' THEN v_fine_val
      WHEN 'percent' THEN (r.total_due - r.paid_amount) * v_fine_val / 100.0
      ELSE 0 END;
    UPDATE public.capital_installment_schedule
       SET status='overdue', fine_amount = v_fine, updated_at=now()
     WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 10. Permission rows
-- ============================================================================
INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT r.id, 'ACCOUNTING', m.name, true, 'full'
FROM public.app_roles r
CROSS JOIN (VALUES ('Capital Contributors'),('Capital Transactions'),('Capital Schedule'),('Capital Dashboard')) AS m(name)
WHERE r.name IN ('Super Admin','Admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_modules (role_id, module_group, module_name, enabled, permission)
SELECT r.id, 'ACCOUNTING', m.name, false, 'none'
FROM public.app_roles r
CROSS JOIN (VALUES ('Capital Contributors'),('Capital Transactions'),('Capital Schedule'),('Capital Dashboard')) AS m(name)
WHERE r.name NOT IN ('Super Admin','Admin')
ON CONFLICT DO NOTHING;
