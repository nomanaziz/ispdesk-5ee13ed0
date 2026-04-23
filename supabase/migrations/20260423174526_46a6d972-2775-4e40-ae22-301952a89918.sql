
-- 1. Extend bw_sale_customers
ALTER TABLE public.bw_sale_customers
  ADD COLUMN IF NOT EXISTS panel_access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS panel_user_limit integer,
  ADD COLUMN IF NOT EXISTS panel_subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS panel_subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS panel_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bw_sale_customers_panel_branch ON public.bw_sale_customers(panel_branch_id);
CREATE INDEX IF NOT EXISTS idx_bw_sale_customers_panel_expires ON public.bw_sale_customers(panel_subscription_expires_at) WHERE panel_access_enabled = true;

-- 2. Pricing slabs table
CREATE TABLE IF NOT EXISTS public.bw_panel_pricing_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_limit integer NOT NULL UNIQUE,
  monthly_price numeric(12,2) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_panel_pricing_slabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing slabs readable by all"
  ON public.bw_panel_pricing_slabs FOR SELECT USING (true);

CREATE POLICY "Admins manage pricing slabs - insert"
  ON public.bw_panel_pricing_slabs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage pricing slabs - update"
  ON public.bw_panel_pricing_slabs FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage pricing slabs - delete"
  ON public.bw_panel_pricing_slabs FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_bw_panel_pricing_slabs_updated_at
  BEFORE UPDATE ON public.bw_panel_pricing_slabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed slabs
INSERT INTO public.bw_panel_pricing_slabs (user_limit, monthly_price, display_order)
VALUES
  (100, 300, 1),
  (300, 800, 2),
  (500, 1500, 3),
  (800, 2500, 4),
  (1200, 4000, 5),
  (1600, 6000, 6),
  (2000, 8000, 7),
  (3000, 10000, 8),
  (5000, 15000, 9)
ON CONFLICT (user_limit) DO NOTHING;

-- 3. Subscription history table
CREATE TABLE IF NOT EXISTS public.bw_panel_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  user_limit integer NOT NULL,
  monthly_price numeric(12,2) NOT NULL,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_reference text,
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_bw_panel_subs_customer ON public.bw_panel_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_bw_panel_subs_status ON public.bw_panel_subscriptions(status);

ALTER TABLE public.bw_panel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read panel subscriptions"
  ON public.bw_panel_subscriptions FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins insert panel subscriptions"
  ON public.bw_panel_subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins update panel subscriptions"
  ON public.bw_panel_subscriptions FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins delete panel subscriptions"
  ON public.bw_panel_subscriptions FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 4. User-limit enforcement trigger on clients
CREATE OR REPLACE FUNCTION public.enforce_bw_panel_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer record;
  v_count integer;
BEGIN
  IF NEW.branch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, panel_user_limit, panel_access_enabled, panel_subscription_expires_at
    INTO v_customer
    FROM public.bw_sale_customers
   WHERE panel_branch_id = NEW.branch_id
   LIMIT 1;

  IF v_customer.id IS NULL THEN
    RETURN NEW; -- not a panel-linked branch
  END IF;

  IF v_customer.panel_access_enabled IS NOT TRUE
     OR v_customer.panel_subscription_expires_at IS NULL
     OR v_customer.panel_subscription_expires_at < now() THEN
    RAISE EXCEPTION 'প্যানেল সাবস্ক্রিপশন সক্রিয় নয় — নতুন ক্লায়েন্ট যোগ করতে আগে সাবস্ক্রিপশন রিনিউ করুন।';
  END IF;

  SELECT count(*) INTO v_count FROM public.clients WHERE branch_id = NEW.branch_id;

  IF v_count >= COALESCE(v_customer.panel_user_limit, 0) THEN
    RAISE EXCEPTION 'ইউজার লিমিট পূর্ণ (% জন)। আরও ক্লায়েন্ট যোগ করতে উচ্চতর প্ল্যানে আপগ্রেড করুন।', v_customer.panel_user_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_bw_panel_user_limit ON public.clients;
CREATE TRIGGER trg_enforce_bw_panel_user_limit
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bw_panel_user_limit();
