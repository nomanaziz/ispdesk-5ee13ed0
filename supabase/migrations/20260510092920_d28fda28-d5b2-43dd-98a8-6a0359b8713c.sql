-- Backfill tariffs to date_to_date
UPDATE public.reseller_tariffs SET tariff_type = 'date_to_date' WHERE tariff_type IS DISTINCT FROM 'date_to_date';

-- Backfill packages
UPDATE public.reseller_tariff_packages SET validity_days = 30 WHERE validity_days IS NULL OR validity_days = 0;
UPDATE public.reseller_tariff_packages SET min_activation_days = 1 WHERE min_activation_days IS NULL OR min_activation_days = 0;

-- New defaults
ALTER TABLE public.reseller_tariff_packages ALTER COLUMN validity_days SET DEFAULT 30;
ALTER TABLE public.reseller_tariff_packages ALTER COLUMN min_activation_days SET DEFAULT 1;
ALTER TABLE public.reseller_tariffs ALTER COLUMN tariff_type SET DEFAULT 'date_to_date';