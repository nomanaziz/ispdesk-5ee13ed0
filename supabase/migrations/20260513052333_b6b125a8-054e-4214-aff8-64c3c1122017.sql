
-- Rewrite manual BW invoice payment RPC to insert into bw_sale_payments (admin-visible)
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
  v_remarks text;
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

  v_remarks := concat_ws(' | ',
    NULLIF('TrxID: ' || COALESCE(_trx_id, ''), 'TrxID: '),
    NULLIF('From: ' || COALESCE(_sender_number, ''), 'From: '),
    NULLIF(_note, ''),
    'Submitted by ' || _user_type || ':' || _username
  );

  INSERT INTO public.bw_sale_payments(
    invoice_id, customer_id,
    payment_date, payment_method,
    amount, discount,
    receipt_no, paid_by,
    description, remarks,
    approved
  ) VALUES (
    _invoice_id, _customer_id,
    CURRENT_DATE, _method,
    _amount, 0,
    _trx_id, _sender_number,
    v_remarks, v_remarks,
    false
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bw_invoice_manual_payment(uuid, uuid, text, text, text, numeric, text, text, text, text) TO anon, authenticated;

-- Backfill: move pending manual requests previously stored in bw_sale_collections to bw_sale_payments
INSERT INTO public.bw_sale_payments (
  invoice_id, customer_id, payment_date, payment_method,
  amount, discount, description, remarks, approved, created_at
)
SELECT
  c.invoice_id, c.customer_id, COALESCE(c.created_at::date, CURRENT_DATE), COALESCE(c.payment_method, 'manual'),
  c.amount, 0, c.note, c.note, false, COALESCE(c.created_at, now())
FROM public.bw_sale_collections c
WHERE c.status = 'pending'
  AND c.invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bw_sale_payments p
    WHERE p.invoice_id = c.invoice_id
      AND p.customer_id = c.customer_id
      AND p.amount = c.amount
      AND p.approved = false
  );
