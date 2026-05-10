-- Helper: resolve buying price + validity days for a client's package
CREATE OR REPLACE FUNCTION public.pop_resolve_client_package_cost(
  p_client_id uuid
) RETURNS TABLE(buy_price numeric, validity_days int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_pop record;
  v_buy numeric := 0;
  v_days int := 30;
BEGIN
  SELECT id, branch_id, package_id, monthly_bill INTO v_client
    FROM public.clients WHERE id = p_client_id;
  IF v_client.id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_pop FROM public.branch_managers
    WHERE branch_id = v_client.branch_id
    ORDER BY created_at ASC NULLS LAST LIMIT 1;

  IF v_client.package_id IS NOT NULL THEN
    SELECT COALESCE(rtp.selling_rate, 0), COALESCE(NULLIF(rtp.validity_days, 0), 30)
      INTO v_buy, v_days
      FROM public.reseller_tariff_packages rtp
      JOIN public.branch_managers bm ON bm.tariff_id = rtp.tariff_id
     WHERE bm.id = v_pop.id
       AND rtp.package_id = v_client.package_id
     LIMIT 1;
  END IF;

  IF v_buy IS NULL OR v_buy <= 0 THEN
    v_buy := COALESCE(v_client.monthly_bill, 0);
  END IF;

  buy_price := v_buy;
  validity_days := COALESCE(v_days, 30);
  RETURN NEXT;
END;
$$;

-- Recharge X days using prepaid daily cost = buying_price / validity_days
CREATE OR REPLACE FUNCTION public.pop_recharge_client_days(
  p_client_id uuid,
  p_days int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_pop record;
  v_pkg record;
  v_buy numeric;
  v_days int;
  v_daily numeric;
  v_cost numeric;
  v_today date := CURRENT_DATE;
  v_start date;
  v_new_expire date;
  v_balance_before numeric;
  v_balance_after numeric;
  v_zone record;
  v_subzone record;
  v_server_name text;
  i int;
  v_day date;
BEGIN
  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'INVALID_DAYS: 1-365 দিনের মধ্যে দিন';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR UPDATE;
  IF v_client.id IS NULL THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND'; END IF;
  IF v_client.branch_id IS NULL THEN RAISE EXCEPTION 'CLIENT_NO_BRANCH'; END IF;

  SELECT * INTO v_pop FROM public.branch_managers
   WHERE branch_id = v_client.branch_id
   ORDER BY created_at ASC NULLS LAST LIMIT 1
   FOR UPDATE;
  IF v_pop.id IS NULL THEN RAISE EXCEPTION 'POP_NOT_FOUND'; END IF;

  SELECT buy_price, validity_days INTO v_buy, v_days
    FROM public.pop_resolve_client_package_cost(p_client_id);
  IF v_buy IS NULL OR v_buy <= 0 THEN RAISE EXCEPTION 'NO_RATE: package buying rate not set'; END IF;
  IF v_days IS NULL OR v_days <= 0 THEN v_days := 30; END IF;

  v_daily := round((v_buy / v_days::numeric)::numeric, 2);
  IF v_daily <= 0 THEN RAISE EXCEPTION 'NO_RATE: daily rate is zero'; END IF;

  v_cost := round((v_daily * p_days)::numeric, 2);
  v_balance_before := COALESCE(v_pop.balance, 0);

  -- Strict prepaid: never allow negative balance
  IF v_balance_before < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: প্রয়োজন ৳%, wallet balance ৳%', v_cost, v_balance_before;
  END IF;

  IF v_client.expire_date IS NOT NULL AND v_client.expire_date >= v_today THEN
    v_start := v_client.expire_date;
  ELSE
    v_start := v_today;
  END IF;
  v_new_expire := v_start + p_days;

  SELECT * INTO v_pkg FROM public.isp_packages WHERE id = v_client.package_id;
  SELECT id, name INTO v_zone FROM public.zones WHERE id = v_client.zone_id;
  SELECT id, name INTO v_subzone FROM public.sub_zones WHERE id = v_client.sub_zone_id;
  IF v_pkg.mikrotik_server_id IS NOT NULL THEN
    SELECT name INTO v_server_name FROM public.mikrotik_devices WHERE id = v_pkg.mikrotik_server_id;
  END IF;

  v_balance_after := v_balance_before - v_cost;

  FOR i IN 0..(p_days - 1) LOOP
    v_day := v_start + i;
    INSERT INTO public.pop_daily_charges (
      pop_id, branch_id, client_id, client_username, client_name,
      package_id, package_name, profile, protocol_type,
      server_id, server_name, zone_id, zone_name, sub_zone_id, sub_zone_name,
      monthly_rate, daily_rate, charged_amount,
      pop_balance_before, pop_balance_after,
      charge_date, charged_by
    ) VALUES (
      v_pop.id, v_pop.branch_id, v_client.id, v_client.username, v_client.name,
      v_client.package_id, v_pkg.name, v_pkg.mikrotik_profile, v_pkg.protocol_type,
      v_pkg.mikrotik_server_id, v_server_name, v_zone.id, v_zone.name, v_subzone.id, v_subzone.name,
      v_buy, v_daily, v_daily,
      v_balance_before, v_balance_after,
      v_day, 'reseller-recharge'
    )
    ON CONFLICT (pop_id, client_id, charge_date) DO NOTHING;
  END LOOP;

  UPDATE public.branch_managers SET balance = v_balance_after WHERE id = v_pop.id;
  UPDATE public.clients
     SET expire_date = v_new_expire,
         mikrotik_status = CASE WHEN mikrotik_status = 'disabled' THEN 'enabled' ELSE mikrotik_status END
   WHERE id = v_client.id;

  RETURN jsonb_build_object(
    'ok', true,
    'days', p_days,
    'daily_rate', v_daily,
    'package_buy_price', v_buy,
    'validity_days', v_days,
    'charged', v_cost,
    'wallet_balance_after', v_balance_after,
    'new_expire_date', v_new_expire
  );
END;
$$;

-- Renew client for ONE full package cycle (used by auto recharge cron)
CREATE OR REPLACE FUNCTION public.pop_auto_renew_client(
  p_client_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buy numeric;
  v_days int;
BEGIN
  SELECT buy_price, validity_days INTO v_buy, v_days
    FROM public.pop_resolve_client_package_cost(p_client_id);
  IF v_buy IS NULL OR v_buy <= 0 THEN
    RAISE EXCEPTION 'NO_RATE';
  END IF;
  IF v_days IS NULL OR v_days <= 0 THEN v_days := 30; END IF;
  RETURN public.pop_recharge_client_days(p_client_id, v_days);
END;
$$;

-- Bulk recharge wrapper unchanged in shape but reuses prepaid logic
CREATE OR REPLACE FUNCTION public.pop_bulk_recharge_clients(
  p_client_ids uuid[],
  p_days int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ok int := 0;
  v_fail int := 0;
  v_total numeric := 0;
  v_errors jsonb := '[]'::jsonb;
  v_res jsonb;
BEGIN
  IF p_client_ids IS NULL OR array_length(p_client_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_CLIENTS';
  END IF;

  FOREACH v_id IN ARRAY p_client_ids LOOP
    BEGIN
      v_res := public.pop_recharge_client_days(v_id, p_days);
      v_ok := v_ok + 1;
      v_total := v_total + COALESCE((v_res->>'charged')::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('client_id', v_id, 'error', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'succeeded', v_ok,
    'failed', v_fail,
    'total_charged', v_total,
    'errors', v_errors
  );
END;
$$;