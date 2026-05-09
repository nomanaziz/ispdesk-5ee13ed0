
-- Update charge function: remove pop_type='prepaid' gate
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

  SELECT id, balance, allow_negative_balance
    INTO v_pop
    FROM public.branch_managers
    WHERE branch_id = v_client.branch_id
    LIMIT 1;
  IF v_pop.id IS NULL THEN
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

-- Update credit refund function: remove prepaid gate
CREATE OR REPLACE FUNCTION public.process_credit_refund_on_client_left()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pop record;
  v_today date := CURRENT_DATE;
  v_expire date;
  v_unused_days integer;
  v_monthly_bill numeric;
  v_daily_rate numeric;
  v_refund numeric;
  v_balance_before numeric;
  v_client_row record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.status,'') = COALESCE(NEW.status,'') OR COALESCE(NEW.status,'') NOT IN ('left','inactive') THEN
      RETURN NEW;
    END IF;
    v_client_row := NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_client_row := OLD;
  ELSE
    RETURN NEW;
  END IF;

  IF v_client_row.branch_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, credit_refund_policy, balance
    INTO v_pop
    FROM public.branch_managers
    WHERE branch_id = v_client_row.branch_id
    LIMIT 1;

  IF v_pop.id IS NULL OR v_pop.credit_refund_policy IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_expire := v_client_row.expire_date;
  IF v_expire IS NULL OR v_expire <= v_today THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_unused_days := v_expire - v_today;
  v_monthly_bill := COALESCE(v_client_row.monthly_bill, 0);
  IF v_monthly_bill <= 0 OR v_unused_days <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_daily_rate := v_monthly_bill / 30.0;
  v_refund := round((v_daily_rate * v_unused_days)::numeric, 2);

  IF v_refund <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_balance_before := COALESCE(v_pop.balance, 0);

  UPDATE public.branch_managers
    SET balance = COALESCE(balance,0) + v_refund
    WHERE id = v_pop.id;

  INSERT INTO public.credit_refund_logs(
    client_id, client_name, client_username, pop_id, package_id,
    daily_rate, paid_days, used_days, refund_days, refund_amount,
    pop_balance_before, pop_balance_after, reason, status
  ) VALUES (
    v_client_row.id, v_client_row.name, v_client_row.username, v_pop.id, v_client_row.package_id,
    v_daily_rate, 30, 30 - v_unused_days, v_unused_days, v_refund,
    v_balance_before, v_balance_before + v_refund,
    CASE WHEN TG_OP='DELETE' THEN 'Client deleted' ELSE 'Client marked as ' || NEW.status END,
    'completed'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop daily-limit trigger and function (no more prepaid/postpaid switching)
DROP TRIGGER IF EXISTS enforce_pop_type_daily_limit ON public.branch_managers;
DROP TRIGGER IF EXISTS trg_enforce_pop_type_daily_limit ON public.branch_managers;
DROP FUNCTION IF EXISTS public.enforce_pop_type_daily_limit();
