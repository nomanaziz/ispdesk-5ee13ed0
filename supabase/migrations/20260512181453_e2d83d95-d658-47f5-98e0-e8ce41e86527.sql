-- Tighten support_tickets RLS: stop public/anon read access.
-- All portal reads/writes now go through the portal-data edge function (service role).
DROP POLICY IF EXISTS "Public can view support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Portal users insert bw_reseller tickets" ON public.support_tickets;