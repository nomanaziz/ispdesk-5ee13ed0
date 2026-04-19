
-- 1. bw_purchase_orders: add request_type + service refs
ALTER TABLE public.bw_purchase_orders
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS target_service_id uuid REFERENCES public.bw_sale_services(id),
  ADD COLUMN IF NOT EXISTS current_service_id uuid REFERENCES public.bw_sale_services(id);

-- 2. bw_sale_customers: payment receiving preferences
ALTER TABLE public.bw_sale_customers
  ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS own_bkash_number text;

-- 3. reseller_subscriptions: admin-controlled feature gating
CREATE TABLE IF NOT EXISTS public.reseller_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basic',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE public.reseller_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage reseller subscriptions" ON public.reseller_subscriptions;
CREATE POLICY "Admins manage reseller subscriptions"
  ON public.reseller_subscriptions FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read reseller subscriptions" ON public.reseller_subscriptions;
CREATE POLICY "Authenticated read reseller subscriptions"
  ON public.reseller_subscriptions FOR SELECT
  USING (true);

CREATE TRIGGER trg_reseller_subscriptions_updated
  BEFORE UPDATE ON public.reseller_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. support_tickets: allow portal users (anon role via service-role calls handled), add insert policy for anon role with source='bw_reseller'
DROP POLICY IF EXISTS "Portal users insert bw_reseller tickets" ON public.support_tickets;
CREATE POLICY "Portal users insert bw_reseller tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (source = 'bw_reseller');
