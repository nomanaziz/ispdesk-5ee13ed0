
CREATE OR REPLACE FUNCTION public.public_lookup_client(_q text)
RETURNS TABLE(id uuid, name text, client_id text, contact text, monthly_bill numeric, status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(_q, ''));
BEGIN
  IF length(q) < 3 THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.client_id,
    CASE WHEN c.contact IS NULL OR length(c.contact) < 4 THEN c.contact
         ELSE repeat('*', length(c.contact) - 3) || right(c.contact, 3) END,
    c.monthly_bill, c.status
  FROM public.clients c
  WHERE lower(c.client_id) = lower(q)
     OR lower(c.user_id)   = lower(q)
     OR lower(c.username)  = lower(q)
     OR c.contact = q
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.client_id,
    CASE WHEN c.contact IS NULL OR length(c.contact) < 4 THEN c.contact
         ELSE repeat('*', length(c.contact) - 3) || right(c.contact, 3) END,
    c.monthly_bill, c.status
  FROM public.clients c
  WHERE c.contact ILIKE '%' || q || '%'
     OR (length(q) >= 4 AND c.name ILIKE '%' || q || '%')
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.public_lookup_client(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_lookup_client(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_lookup_bills(_client_id uuid)
RETURNS TABLE(id uuid, month text, amount numeric, paid numeric, due numeric, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.month, b.amount, b.paid, b.due, b.status
  FROM public.billing b
  WHERE b.client_id = _client_id
  ORDER BY b.month DESC
  LIMIT 12;
$$;

REVOKE ALL ON FUNCTION public.public_lookup_bills(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_lookup_bills(uuid) TO anon, authenticated;
