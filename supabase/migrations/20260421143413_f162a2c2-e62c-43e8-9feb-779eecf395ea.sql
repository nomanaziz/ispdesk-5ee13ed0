-- 1. Table
CREATE TABLE IF NOT EXISTS public.pop_package_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_manager_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  tariff_package_id uuid NOT NULL REFERENCES public.reseller_tariff_packages(id) ON DELETE CASCADE,
  pop_selling_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_manager_id, tariff_package_id)
);

CREATE INDEX IF NOT EXISTS idx_pop_package_pricing_pop ON public.pop_package_pricing(branch_manager_id);
CREATE INDEX IF NOT EXISTS idx_pop_package_pricing_pkg ON public.pop_package_pricing(tariff_package_id);

-- 2. updated_at trigger
DROP TRIGGER IF EXISTS trg_pop_package_pricing_updated_at ON public.pop_package_pricing;
CREATE TRIGGER trg_pop_package_pricing_updated_at
BEFORE UPDATE ON public.pop_package_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS
ALTER TABLE public.pop_package_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage pop_package_pricing" ON public.pop_package_pricing;
CREATE POLICY "Admins manage pop_package_pricing"
ON public.pop_package_pricing
FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read pop_package_pricing" ON public.pop_package_pricing;
CREATE POLICY "Authenticated read pop_package_pricing"
ON public.pop_package_pricing
FOR SELECT
TO authenticated
USING (true);

-- 4. Auto-seed pricing rows when a new tariff package is added
CREATE OR REPLACE FUNCTION public.seed_pop_pricing_for_package()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pop_package_pricing (branch_manager_id, tariff_package_id, pop_selling_rate)
  SELECT bm.id, NEW.id, COALESCE(NEW.selling_rate, 0)
    FROM public.branch_managers bm
   WHERE bm.tariff_id = NEW.tariff_id
  ON CONFLICT (branch_manager_id, tariff_package_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_pop_pricing_on_package ON public.reseller_tariff_packages;
CREATE TRIGGER trg_seed_pop_pricing_on_package
AFTER INSERT ON public.reseller_tariff_packages
FOR EACH ROW EXECUTE FUNCTION public.seed_pop_pricing_for_package();

-- 5. Auto-seed pricing rows when a POP is (re)assigned to a tariff
CREATE OR REPLACE FUNCTION public.seed_pop_pricing_for_pop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tariff_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.tariff_id::text,'') = COALESCE(NEW.tariff_id::text,'') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.pop_package_pricing (branch_manager_id, tariff_package_id, pop_selling_rate)
  SELECT NEW.id, tp.id, COALESCE(tp.selling_rate, 0)
    FROM public.reseller_tariff_packages tp
   WHERE tp.tariff_id = NEW.tariff_id
  ON CONFLICT (branch_manager_id, tariff_package_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_pop_pricing_on_pop ON public.branch_managers;
CREATE TRIGGER trg_seed_pop_pricing_on_pop
AFTER INSERT OR UPDATE OF tariff_id ON public.branch_managers
FOR EACH ROW EXECUTE FUNCTION public.seed_pop_pricing_for_pop();

-- 6. Backfill existing POPs/packages
INSERT INTO public.pop_package_pricing (branch_manager_id, tariff_package_id, pop_selling_rate)
SELECT bm.id, tp.id, COALESCE(tp.selling_rate, 0)
  FROM public.branch_managers bm
  JOIN public.reseller_tariff_packages tp ON tp.tariff_id = bm.tariff_id
 WHERE bm.tariff_id IS NOT NULL
ON CONFLICT (branch_manager_id, tariff_package_id) DO NOTHING;