CREATE OR REPLACE FUNCTION public.create_bw_portal_service_order(
  _customer_id uuid,
  _username text,
  _user_type text,
  _session_id text,
  _request_type text,
  _service_name text,
  _current_mbps numeric DEFAULT NULL,
  _target_mbps numeric DEFAULT NULL,
  _effective_date date DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_ok boolean := false;
  v_order_id uuid;
  v_order_no text;
  v_summary text;
  v_target text;
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer required';
  END IF;
  IF _session_id IS NULL OR length(trim(_session_id)) = 0 THEN
    RAISE EXCEPTION 'Session required';
  END IF;
  IF _username IS NULL OR length(trim(_username)) = 0 THEN
    RAISE EXCEPTION 'Username required';
  END IF;
  IF _user_type NOT IN ('bw_customer','reseller','reseller_sub') THEN
    RAISE EXCEPTION 'Invalid portal user';
  END IF;
  IF _request_type NOT IN ('upgrade','downgrade','discontinue') THEN
    RAISE EXCEPTION 'Invalid request type';
  END IF;
  IF _service_name IS NULL OR length(trim(_service_name)) = 0 THEN
    RAISE EXCEPTION 'Service required';
  END IF;
  IF _request_type <> 'discontinue' AND (COALESCE(_target_mbps, 0) <= 0) THEN
    RAISE EXCEPTION 'Target bandwidth required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.portal_login_log pll
    WHERE pll.session_id = _session_id
      AND pll.username = _username
      AND pll.user_type = _user_type
      AND pll.status = 'active'
      AND pll.logout_at IS NULL
      AND pll.login_at > now() - interval '2 days'
  ) INTO v_session_ok;

  IF NOT v_session_ok THEN
    RAISE EXCEPTION 'Invalid or expired portal session';
  END IF;

  v_order_no := 'SO-' || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  v_target := CASE WHEN _request_type = 'discontinue' THEN 'STOP' ELSE trim(to_char(_target_mbps, 'FM999999990.##')) || ' Mbps' END;
  v_summary := '[' || upper(_request_type) || '] ' || trim(_service_name) || ': ' ||
    COALESCE(trim(to_char(_current_mbps, 'FM999999990.##')) || ' Mbps', 'current') || ' → ' || v_target;

  INSERT INTO public.bw_purchase_orders (
    reseller_id,
    order_no,
    status,
    total,
    request_type,
    effective_date,
    note
  ) VALUES (
    _customer_id,
    v_order_no,
    'pending',
    0,
    _request_type,
    _effective_date,
    v_summary || CASE WHEN COALESCE(trim(_note), '') <> '' THEN E'\n\n' || trim(_note) ELSE '' END
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.bw_purchase_order_items (
    order_id,
    item_name,
    description,
    unit,
    quantity,
    rate,
    total
  ) VALUES (
    v_order_id,
    trim(_service_name),
    v_summary,
    'Mbps',
    CASE WHEN _request_type = 'discontinue' THEN 0 ELSE COALESCE(_target_mbps, 0) END,
    0,
    0
  );

  RETURN jsonb_build_object('id', v_order_id, 'order_no', v_order_no);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bw_portal_service_order(uuid, text, text, text, text, text, numeric, numeric, date, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_bw_portal_invoice_detail(
  _invoice_id uuid,
  _customer_id uuid DEFAULT NULL,
  _username text DEFAULT NULL,
  _user_type text DEFAULT NULL,
  _session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_ok boolean := false;
  v_inv record;
  v_items jsonb := '[]'::jsonb;
  v_payments jsonb := '[]'::jsonb;
BEGIN
  IF _invoice_id IS NULL THEN
    RAISE EXCEPTION 'Invoice required';
  END IF;

  IF public.is_admin_or_super(auth.uid()) THEN
    v_session_ok := true;
  ELSIF _customer_id IS NOT NULL
        AND COALESCE(_username, '') <> ''
        AND COALESCE(_user_type, '') IN ('bw_customer','reseller','reseller_sub')
        AND COALESCE(_session_id, '') <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.portal_login_log pll
      WHERE pll.session_id = _session_id
        AND pll.username = _username
        AND pll.user_type = _user_type
        AND pll.status = 'active'
        AND pll.logout_at IS NULL
        AND pll.login_at > now() - interval '2 days'
    ) INTO v_session_ok;
  END IF;

  IF NOT v_session_ok THEN
    RAISE EXCEPTION 'Invalid or expired portal session';
  END IF;

  SELECT
    i.*,
    c.customer_name,
    c.customer_code,
    c.address AS customer_address,
    c.mobile AS customer_mobile,
    c.email AS customer_email
  INTO v_inv
  FROM public.bw_sales_invoices i
  LEFT JOIN public.bw_sale_customers c ON c.id = i.customer_id
  WHERE i.id = _invoice_id
    AND (
      public.is_admin_or_super(auth.uid())
      OR _customer_id IS NULL
      OR i.customer_id = _customer_id
    )
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RETURN jsonb_build_object('invoice', NULL, 'items', v_items, 'payments', v_payments);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(ii) ORDER BY ii.sort_order NULLS LAST, ii.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.bw_invoice_items ii
  WHERE ii.invoice_id = _invoice_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.receive_date DESC NULLS LAST, p.created_at DESC), '[]'::jsonb)
  INTO v_payments
  FROM public.bw_sale_collections p
  WHERE p.invoice_id = _invoice_id;

  RETURN jsonb_build_object(
    'invoice', to_jsonb(v_inv),
    'items', v_items,
    'payments', v_payments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bw_portal_invoice_detail(uuid, uuid, text, text, text) TO anon, authenticated;