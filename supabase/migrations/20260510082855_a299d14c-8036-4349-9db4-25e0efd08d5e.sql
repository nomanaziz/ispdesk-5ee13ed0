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
    SELECT COALESCE(rtp.selling_rate, 0),
           COALESCE(NULLIF(rtp.min_activation_days, 0), 30)
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