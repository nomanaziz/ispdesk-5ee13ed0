
-- 1. portal_login_log: restrict SELECT to admins only (was visible to any authenticated user)
DROP POLICY IF EXISTS "Authenticated can view login log" ON public.portal_login_log;
CREATE POLICY "Admins can view login log"
  ON public.portal_login_log FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Lock down anonymous UPDATE that allowed any authenticated user to mutate logs
DROP POLICY IF EXISTS "Authenticated can update login log" ON public.portal_login_log;
CREATE POLICY "Admins can update login log"
  ON public.portal_login_log FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 2. zkteco_attendance_logs: drop the overly broad authenticated SELECT (admin-only policy stays)
DROP POLICY IF EXISTS "Authenticated can view zkteco_logs" ON public.zkteco_attendance_logs;

-- 3. pop_recharge_logs: tighten INSERT — only service role / admins can insert
DROP POLICY IF EXISTS "Service role can insert recharge logs" ON public.pop_recharge_logs;
CREATE POLICY "Admins can insert recharge logs"
  ON public.pop_recharge_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 4. billing_enforcement_runs: tighten INSERT — only admins (service role bypasses RLS)
DROP POLICY IF EXISTS "Service role can insert enforcement runs" ON public.billing_enforcement_runs;
CREATE POLICY "Admins can insert enforcement runs"
  ON public.billing_enforcement_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));
