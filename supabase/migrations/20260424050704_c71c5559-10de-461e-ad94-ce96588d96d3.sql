-- 1. Extend bw_panel_pricing_slabs with tiered pricing fields
ALTER TABLE public.bw_panel_pricing_slabs
  ADD COLUMN IF NOT EXISTS tier_name text,
  ADD COLUMN IF NOT EXISTS min_users integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS flat_price numeric,
  ADD COLUMN IF NOT EXISTS per_user_rate numeric;

-- Make legacy columns nullable so new tier rows don't need them
ALTER TABLE public.bw_panel_pricing_slabs
  ALTER COLUMN user_limit DROP NOT NULL,
  ALTER COLUMN monthly_price DROP NOT NULL;

-- Validation trigger for billing_mode
CREATE OR REPLACE FUNCTION public.validate_bw_panel_pricing_slab()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.billing_mode NOT IN ('flat','per_user','free') THEN
    RAISE EXCEPTION 'billing_mode must be flat, per_user, or free';
  END IF;
  IF NEW.billing_mode = 'flat' AND COALESCE(NEW.flat_price, -1) < 0 THEN
    RAISE EXCEPTION 'flat_price required when billing_mode = flat';
  END IF;
  IF NEW.billing_mode = 'per_user' AND COALESCE(NEW.per_user_rate, -1) < 0 THEN
    RAISE EXCEPTION 'per_user_rate required when billing_mode = per_user';
  END IF;
  -- Mirror to legacy columns for backward compat
  NEW.user_limit := COALESCE(NEW.max_users, 999999);
  NEW.monthly_price := CASE
    WHEN NEW.billing_mode = 'flat' THEN COALESCE(NEW.flat_price, 0)
    WHEN NEW.billing_mode = 'per_user' THEN COALESCE(NEW.per_user_rate, 0) * COALESCE(NEW.max_users, NEW.min_users)
    ELSE 0
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_bw_panel_pricing_slab ON public.bw_panel_pricing_slabs;
CREATE TRIGGER trg_validate_bw_panel_pricing_slab
  BEFORE INSERT OR UPDATE ON public.bw_panel_pricing_slabs
  FOR EACH ROW EXECUTE FUNCTION public.validate_bw_panel_pricing_slab();

-- Clear old slabs and seed 3 tiers
DELETE FROM public.bw_panel_pricing_slabs;

INSERT INTO public.bw_panel_pricing_slabs
  (tier_name, min_users, max_users, billing_mode, flat_price, per_user_rate, display_order, is_active)
VALUES
  ('Starter', 0, 500, 'flat', 500, NULL, 1, true),
  ('Growth', 501, 3000, 'per_user', NULL, 1, 2, true),
  ('Pro', 3001, NULL, 'free', NULL, NULL, 3, true);

-- 2. Add usage tracking columns to bw_sale_customers
ALTER TABLE public.bw_sale_customers
  ADD COLUMN IF NOT EXISTS active_client_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier_id uuid REFERENCES public.bw_panel_pricing_slabs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_month_estimated_bill numeric NOT NULL DEFAULT 0;

-- 3. Helper: compute tier + bill for a given user count
CREATE OR REPLACE FUNCTION public.bw_panel_resolve_tier(_count integer)
RETURNS TABLE(tier_id uuid, estimated_bill numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier record;
  v_bill numeric := 0;
BEGIN
  SELECT * INTO v_tier
    FROM public.bw_panel_pricing_slabs
   WHERE is_active = true
     AND _count >= min_users
     AND (max_users IS NULL OR _count <= max_users)
   ORDER BY display_order
   LIMIT 1;

  IF v_tier.id IS NULL THEN
    RETURN;
  END IF;

  v_bill := CASE
    WHEN v_tier.billing_mode = 'flat' THEN COALESCE(v_tier.flat_price, 0)
    WHEN v_tier.billing_mode = 'per_user' THEN COALESCE(v_tier.per_user_rate, 0) * _count
    ELSE 0
  END;

  tier_id := v_tier.id;
  estimated_bill := v_bill;
  RETURN NEXT;
END;
$$;

-- 4. Recalc function for a single customer
CREATE OR REPLACE FUNCTION public.bw_panel_recalc_customer_usage(_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch uuid;
  v_count integer := 0;
  v_tier uuid;
  v_bill numeric := 0;
BEGIN
  SELECT panel_branch_id INTO v_branch
    FROM public.bw_sale_customers
   WHERE id = _customer_id;

  IF v_branch IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.clients WHERE branch_id = v_branch;
  END IF;

  SELECT t.tier_id, t.estimated_bill INTO v_tier, v_bill
    FROM public.bw_panel_resolve_tier(v_count) t;

  UPDATE public.bw_sale_customers
     SET active_client_count = v_count,
         current_tier_id = v_tier,
         next_month_estimated_bill = COALESCE(v_bill, 0)
   WHERE id = _customer_id;
END;
$$;

-- 5. Trigger on clients table — recalc owner customer when client added/removed/branch-changed
CREATE OR REPLACE FUNCTION public.trg_bw_panel_client_usage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.branch_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.bw_sale_customers
     WHERE panel_branch_id = NEW.branch_id
     LIMIT 1;
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.bw_panel_recalc_customer_usage(v_customer_id);
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE','DELETE') AND COALESCE(OLD.branch_id::text,'') <> COALESCE(NEW.branch_id::text,'') AND OLD.branch_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.bw_sale_customers
     WHERE panel_branch_id = OLD.branch_id
     LIMIT 1;
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.bw_panel_recalc_customer_usage(v_customer_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_bw_panel_usage ON public.clients;
CREATE TRIGGER trg_clients_bw_panel_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_bw_panel_client_usage_sync();

-- 6. When a slab changes, refresh ALL customer usages
CREATE OR REPLACE FUNCTION public.trg_bw_panel_slab_change_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.bw_sale_customers WHERE panel_branch_id IS NOT NULL LOOP
    PERFORM public.bw_panel_recalc_customer_usage(r.id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_slab_change_refresh ON public.bw_panel_pricing_slabs;
CREATE TRIGGER trg_slab_change_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.bw_panel_pricing_slabs
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bw_panel_slab_change_refresh();

-- 7. Initial backfill for existing customers
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.bw_sale_customers WHERE panel_branch_id IS NOT NULL LOOP
    PERFORM public.bw_panel_recalc_customer_usage(r.id);
  END LOOP;
END $$;