
-- Ledger table
CREATE TABLE IF NOT EXISTS public.pop_balance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  branch_manager_id uuid,
  client_id uuid,
  mikrotik_client_id uuid,
  amount numeric NOT NULL,
  balance_before numeric,
  balance_after numeric,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pop_balance_ledger_branch ON public.pop_balance_ledger(branch_id, created_at DESC);

ALTER TABLE public.pop_balance_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage pop_balance_ledger" ON public.pop_balance_ledger;
CREATE POLICY "Admins manage pop_balance_ledger" ON public.pop_balance_ledger
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Branch members view pop_balance_ledger" ON public.pop_balance_ledger;
CREATE POLICY "Branch members view pop_balance_ledger" ON public.pop_balance_ledger
  FOR SELECT TO authenticated
  USING (branch_id = public.get_user_branch(auth.uid()) OR public.is_admin_or_super(auth.uid()));

-- Helper function
CREATE OR REPLACE FUNCTION public.charge_pop_for_client_activation(
  _client_id uuid,
  _mikrotik_client_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_pop record;
  v_amount numeric;
  v_before numeric;
BEGIN
  SELECT id, branch_id, package_id, monthly_bill, username, name
    INTO v_client
    FROM public.clients WHERE id = _client_id;
  IF v_client.id IS NULL OR v_client.branch_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, pop_type, balance, allow_negative_balance
    INTO v_pop
    FROM public.branch_managers
    WHERE branch_id = v_client.branch_id
    LIMIT 1;
  IF v_pop.id IS NULL THEN
    RETURN;
  END IF;

  -- Only enforce on prepaid POPs
  IF COALESCE(v_pop.pop_type, 'prepaid') <> 'prepaid' THEN
    RETURN;
  END IF;

  -- Resolve package rate: pop-specific → tariff package → client.monthly_bill
  SELECT pop_selling_rate INTO v_amount
    FROM public.pop_package_pricing
    WHERE branch_manager_id = v_pop.id AND tariff_package_id = v_client.package_id
    LIMIT 1;

  IF v_amount IS NULL AND v_client.package_id IS NOT NULL THEN
    SELECT selling_rate INTO v_amount
      FROM public.reseller_tariff_packages
      WHERE id = v_client.package_id
      LIMIT 1;
  END IF;

  IF v_amount IS NULL THEN
    v_amount := COALESCE(v_client.monthly_bill, 0);
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN;
  END IF;

  v_before := COALESCE(v_pop.balance, 0);

  -- Allow negative balance? skip block but still record
  IF v_before < v_amount AND COALESCE(v_pop.allow_negative_balance, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: প্রয়োজন ৳% — বর্তমান balance ৳%। আগে recharge করুন।',
      v_amount, v_before
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.branch_managers
    SET balance = COALESCE(balance, 0) - v_amount
    WHERE id = v_pop.id;

  INSERT INTO public.pop_balance_ledger(
    branch_id, branch_manager_id, client_id, mikrotik_client_id,
    amount, balance_before, balance_after, reason
  ) VALUES (
    v_client.branch_id, v_pop.id, v_client.id, _mikrotik_client_id,
    -v_amount, v_before, v_before - v_amount,
    'Client activation: ' || COALESCE(v_client.username, v_client.name, v_client.id::text)
  );
END;
$$;

-- Trigger on clients
CREATE OR REPLACE FUNCTION public.trg_charge_pop_on_client_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, '') = 'active' THEN
      PERFORM public.charge_pop_for_client_activation(NEW.id, NULL);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
      PERFORM public.charge_pop_for_client_activation(NEW.id, NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_charge_pop_on_client_activation ON public.clients;
CREATE TRIGGER trg_charge_pop_on_client_activation
  AFTER INSERT OR UPDATE OF status ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_charge_pop_on_client_activation();

-- Trigger on mikrotik_clients enable
CREATE OR REPLACE FUNCTION public.trg_charge_pop_on_mt_enable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.status,'') = 'disabled' AND COALESCE(NEW.status,'') <> 'disabled' THEN
    IF NEW.linked_client_id IS NOT NULL THEN
      PERFORM public.charge_pop_for_client_activation(NEW.linked_client_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_charge_pop_on_mt_enable ON public.mikrotik_clients;
CREATE TRIGGER trg_charge_pop_on_mt_enable
  BEFORE UPDATE OF status ON public.mikrotik_clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_charge_pop_on_mt_enable();
