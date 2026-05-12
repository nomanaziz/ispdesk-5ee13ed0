
CREATE OR REPLACE FUNCTION public.create_bw_invoice_manual_payment(
  _invoice_id uuid,
  _customer_id uuid,
  _username text,
  _user_type text,
  _session_id text,
  _amount numeric,
  _method text,
  _sender_number text DEFAULT NULL,
  _trx_id text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_ok boolean := false;
  v_inv record;
  v_id uuid;
  v_total numeric;
  v_new_due numeric;
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

  SELECT * INTO v_inv
  FROM public.bw_sales_invoices
  WHERE id = _invoice_id AND customer_id = _customer_id
  LIMIT 1;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found for this customer'; END IF;

  v_total := COALESCE(v_inv.total_amount, v_inv.amount, 0);
  v_new_due := GREATEST(0, v_total - COALESCE(v_inv.discount, 0) - COALESCE(v_inv.paid_amount, 0) - _amount);

  INSERT INTO public.bw_sale_collections(
    invoice_id,
    customer_id,
    amount,
    balance_due,
    payment_method,
    note,
    status
  ) VALUES (
    _invoice_id,
    _customer_id,
    _amount,
    v_new_due,
    _method,
    concat_ws(' | ', NULLIF('TrxID: ' || COALESCE(_trx_id, ''), 'TrxID: '), NULLIF('From: ' || COALESCE(_sender_number, ''), 'From: '), NULLIF(_note, '')),
    'pending'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bw_invoice_manual_payment(uuid, uuid, text, text, text, numeric, text, text, text, text) TO anon, authenticated;
