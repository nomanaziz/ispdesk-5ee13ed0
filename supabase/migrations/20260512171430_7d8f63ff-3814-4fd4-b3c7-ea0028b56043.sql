
-- 1. public_payment_requests: allow BW invoice payments
ALTER TABLE public.public_payment_requests
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.public_payment_requests
  ADD COLUMN IF NOT EXISTS bw_invoice_id uuid REFERENCES public.bw_sales_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bw_customer_id uuid REFERENCES public.bw_sale_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS return_origin text;

-- 2. bw_purchase_orders: drop wrong FK so BW customers (bw_sale_customers) can also use it
ALTER TABLE public.bw_purchase_orders
  DROP CONSTRAINT IF EXISTS bw_purchase_orders_reseller_id_fkey;

-- 3. create_bw_portal_service_order: validate identity against the right table per user_type
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
  v_owner_ok boolean := false;
  v_order_id uuid;
  v_order_no text;
  v_summary text;
  v_target text;
BEGIN
  IF _customer_id IS NULL THEN RAISE EXCEPTION 'Customer required'; END IF;
  IF _session_id IS NULL OR length(trim(_session_id)) = 0 THEN RAISE EXCEPTION 'Session required'; END IF;
  IF _username IS NULL OR length(trim(_username)) = 0 THEN RAISE EXCEPTION 'Username required'; END IF;
  IF _user_type NOT IN ('bw_customer','reseller','reseller_sub') THEN RAISE EXCEPTION 'Invalid portal user'; END IF;
  IF _request_type NOT IN ('upgrade','downgrade','discontinue') THEN RAISE EXCEPTION 'Invalid request type'; END IF;
  IF _service_name IS NULL OR length(trim(_service_name)) = 0 THEN RAISE EXCEPTION 'Service required'; END IF;
  IF _request_type <> 'discontinue' AND COALESCE(_target_mbps, 0) <= 0 THEN
    RAISE EXCEPTION 'Target bandwidth required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.portal_login_log pll
    WHERE pll.session_id = _session_id
      AND pll.username = _username
      AND pll.user_type = _user_type
      AND pll.status = 'active'
      AND pll.logout_at IS NULL
      AND pll.login_at > now() - interval '2 days'
  ) INTO v_session_ok;
  IF NOT v_session_ok THEN RAISE EXCEPTION 'Invalid or expired portal session'; END IF;

  -- Validate _customer_id against the correct table per user type
  IF _user_type = 'bw_customer' THEN
    SELECT EXISTS(SELECT 1 FROM public.bw_sale_customers WHERE id = _customer_id) INTO v_owner_ok;
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.branch_managers WHERE id = _customer_id) INTO v_owner_ok;
  END IF;
  IF NOT v_owner_ok THEN RAISE EXCEPTION 'Customer not found'; END IF;

  v_order_no := 'SO-' || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  v_target := CASE WHEN _request_type = 'discontinue' THEN 'STOP'
                   ELSE trim(to_char(_target_mbps, 'FM999999990.##')) || ' Mbps' END;
  v_summary := '[' || upper(_request_type) || '] ' || trim(_service_name) || ': ' ||
    COALESCE(trim(to_char(_current_mbps, 'FM999999990.##')) || ' Mbps', 'current') || ' → ' || v_target;

  INSERT INTO public.bw_purchase_orders (
    reseller_id, order_no, status, total, request_type, effective_date, note
  ) VALUES (
    _customer_id, v_order_no, 'pending', 0, _request_type, _effective_date,
    v_summary || CASE WHEN COALESCE(trim(_note),'') <> '' THEN E'\n\n' || trim(_note) ELSE '' END
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.bw_purchase_order_items (
    order_id, item_name, description, unit, quantity, rate, total
  ) VALUES (
    v_order_id, trim(_service_name), v_summary, 'Mbps',
    CASE WHEN _request_type = 'discontinue' THEN 0 ELSE COALESCE(_target_mbps, 0) END,
    0, 0
  );

  RETURN jsonb_build_object('id', v_order_id, 'order_no', v_order_no);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bw_portal_service_order(uuid, text, text, text, text, text, numeric, numeric, date, text) TO anon, authenticated;

-- 4. New RPC: create_bw_invoice_payment_request
CREATE OR REPLACE FUNCTION public.create_bw_invoice_payment_request(
  _invoice_id uuid,
  _customer_id uuid,
  _username text,
  _user_type text,
  _session_id text,
  _amount numeric,
  _method text,
  _return_origin text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_ok boolean := false;
  v_inv_ok boolean := false;
  v_id uuid;
BEGIN
  IF _invoice_id IS NULL OR _customer_id IS NULL THEN RAISE EXCEPTION 'Invoice/customer required'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _method IS NULL OR length(trim(_method)) = 0 THEN RAISE EXCEPTION 'Method required'; END IF;
  IF _user_type NOT IN ('bw_customer','reseller','reseller_sub') THEN RAISE EXCEPTION 'Invalid portal user'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.portal_login_log pll
    WHERE pll.session_id = _session_id
      AND pll.username = _username
      AND pll.user_type = _user_type
      AND pll.status = 'active'
      AND pll.logout_at IS NULL
      AND pll.login_at > now() - interval '2 days'
  ) INTO v_session_ok;
  IF NOT v_session_ok THEN RAISE EXCEPTION 'Invalid or expired portal session'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.bw_sales_invoices WHERE id = _invoice_id AND customer_id = _customer_id
  ) INTO v_inv_ok;
  IF NOT v_inv_ok THEN RAISE EXCEPTION 'Invoice not found for this customer'; END IF;

  INSERT INTO public.public_payment_requests(
    amount, method, status, purpose, bw_invoice_id, bw_customer_id, return_origin, note
  ) VALUES (
    _amount, _method, 'pending', 'bw_invoice', _invoice_id, _customer_id, _return_origin,
    'BW invoice payment via ' || _method
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bw_invoice_payment_request(uuid, uuid, text, text, text, numeric, text, text) TO anon, authenticated;
