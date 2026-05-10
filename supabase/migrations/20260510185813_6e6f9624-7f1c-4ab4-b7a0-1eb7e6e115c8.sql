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

  SELECT id, balance, allow_negative_balance, fund_started
    INTO v_pop
    FROM public.branch_managers
    WHERE branch_id = v_client.branch_id
    LIMIT 1;
  IF v_pop.id IS NULL THEN
    RETURN;
  END IF;

  -- Fund not started yet: no balance check, no deduction. POP is in free/setup mode.
  IF COALESCE(v_pop.fund_started, false) IS NOT TRUE THEN
    RETURN;
  END IF;

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