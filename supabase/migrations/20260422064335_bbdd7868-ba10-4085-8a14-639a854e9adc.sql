-- 1. Reset corrupted POP selling rates that are below Admin's selling_rate (which is POP's buying floor)
UPDATE public.pop_package_pricing ppp
SET pop_selling_rate = rtp.selling_rate,
    updated_at = now()
FROM public.reseller_tariff_packages rtp
WHERE ppp.tariff_package_id = rtp.id
  AND ppp.pop_selling_rate < COALESCE(rtp.selling_rate, 0);

-- 2. Safeguard trigger: never allow pop_selling_rate below admin's selling_rate
CREATE OR REPLACE FUNCTION public.enforce_pop_selling_floor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_rate numeric;
BEGIN
  SELECT selling_rate INTO v_admin_rate
    FROM public.reseller_tariff_packages
    WHERE id = NEW.tariff_package_id;
  IF v_admin_rate IS NOT NULL AND COALESCE(NEW.pop_selling_rate, 0) < v_admin_rate THEN
    NEW.pop_selling_rate := v_admin_rate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pop_selling_floor ON public.pop_package_pricing;
CREATE TRIGGER trg_enforce_pop_selling_floor
BEFORE INSERT OR UPDATE ON public.pop_package_pricing
FOR EACH ROW EXECUTE FUNCTION public.enforce_pop_selling_floor();