CREATE OR REPLACE FUNCTION public.create_public_payment_request(
  _client_id uuid,
  _amount numeric,
  _method text,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id) THEN
    RAISE EXCEPTION 'Invalid client';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF _method IS NULL OR length(trim(_method)) = 0 THEN
    RAISE EXCEPTION 'Method required';
  END IF;

  INSERT INTO public.public_payment_requests(client_id, amount, method, trx_id, status, note)
  VALUES (
    _client_id,
    _amount,
    _method,
    'pending-' || extract(epoch FROM now())::bigint::text,
    'pending',
    _note
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_payment_request(uuid, numeric, text, text) TO anon, authenticated;