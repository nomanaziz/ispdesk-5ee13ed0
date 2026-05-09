-- 1) tenant_domains: remove email-based privilege escalation
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tenant_domains' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_domains', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage tenant domains"
ON public.tenant_domains
FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 2) public_payment_requests: admin-only SELECT
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='public_payment_requests' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.public_payment_requests', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins view payment requests"
ON public.public_payment_requests
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 3) portal_login_log: drop public insert/update; allow authenticated only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='portal_login_log' AND cmd IN ('INSERT','UPDATE') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.portal_login_log', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated can insert login log"
ON public.portal_login_log
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update login log"
ON public.portal_login_log
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4) system_logs: admin-only SELECT
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='system_logs' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_logs', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins view system logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 5) support_ticket_messages: drop public insert; authenticated only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='support_ticket_messages' AND cmd='INSERT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_ticket_messages', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated can insert ticket messages"
ON public.support_ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6) bw_invoice_items: drop anon SELECT; authenticated only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='bw_invoice_items' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bw_invoice_items', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated view bw_invoice_items"
ON public.bw_invoice_items
FOR SELECT
TO authenticated
USING (true);
