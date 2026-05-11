-- Fix overly broad RLS policies reported by the security scan

-- 1) clients: full rows contain PPPoE passwords and NID data, so full table reads must be admin-only.
DROP POLICY IF EXISTS "Staff can view clients in their branch" ON public.clients;
CREATE POLICY "Admins can view full client records"
ON public.clients
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 2) branch_funding: no cross-branch financial ledger reads.
DROP POLICY IF EXISTS "Authenticated can view branch_funding" ON public.branch_funding;
CREATE POLICY "Admins or same branch can view branch_funding"
ON public.branch_funding
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR (branch_id IS NOT NULL AND branch_id = public.get_user_branch(auth.uid()))
);

-- 3) support_tickets: prevent all-authenticated read/realtime exposure.
DROP POLICY IF EXISTS "Authenticated can view support_tickets" ON public.support_tickets;
CREATE POLICY "Admins can view support_tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets;
  END IF;
END $$;

-- 4) audit logs: direct writes should not be forgeable by any signed-in user.
DROP POLICY IF EXISTS "Authenticated can insert login log" ON public.portal_login_log;
CREATE POLICY "Admins can insert login log"
ON public.portal_login_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Authenticated insert logs" ON public.system_logs;
CREATE POLICY "Admins can insert system logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 5) reseller package rates and POP balance ledger are financial/margin data.
DROP POLICY IF EXISTS "Authenticated read tariff packages" ON public.reseller_tariff_packages;
CREATE POLICY "Admins can read tariff packages"
ON public.reseller_tariff_packages
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Branch members view pop_balance_ledger" ON public.pop_balance_ledger;
CREATE POLICY "Admins view pop_balance_ledger"
ON public.pop_balance_ledger
FOR SELECT
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

-- 6) app_vault has RLS enabled but no explicit policy. Keep default-deny for non-admins.
DROP POLICY IF EXISTS "Admins can manage app_vault" ON public.app_vault;
CREATE POLICY "Admins can manage app_vault"
ON public.app_vault
FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 7) set fixed search_path on functions that were missing it.
ALTER FUNCTION public.generate_license_key() SET search_path = public;

-- 8) reduce direct API exposure for SECURITY DEFINER helper functions where safe.
-- Functions used only by triggers/internal code keep owner execution but are not callable through anon/authenticated API roles.
REVOKE EXECUTE ON FUNCTION public.apply_branch_funding_delete_to_balance() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_branch_funding_to_balance() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_settlement_to_pgw_payments() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_table_changes() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bw_panel_recalc_customer_usage(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_bw_panel_user_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_pop_selling_floor() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_branch_for_pop() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_tariff_meta_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_tariff_package_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.process_credit_refund_on_client_left() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_pop_pricing_for_package() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_pop_pricing_for_pop() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_client_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_asset_stock() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_client_to_network_diagram() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_bw_panel_client_usage_sync() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_bw_panel_slab_change_refresh() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_bw_panel_subscription_to_income() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_seed_pop_defaults() FROM anon, authenticated, public;

-- Role/lookup RPC helpers that are intentionally used by the app remain executable.