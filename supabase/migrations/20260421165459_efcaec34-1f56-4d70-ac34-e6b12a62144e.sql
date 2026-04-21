UPDATE public.reseller_tariff_packages
SET buy_rate = selling_rate
WHERE COALESCE(buy_rate, 0) IS DISTINCT FROM COALESCE(selling_rate, 0);