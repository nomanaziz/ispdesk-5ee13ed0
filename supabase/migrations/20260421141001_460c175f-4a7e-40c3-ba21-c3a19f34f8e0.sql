ALTER TABLE public.reseller_tariff_packages
  ADD COLUMN IF NOT EXISTS effective_from timestamptz,
  ADD COLUMN IF NOT EXISTS effective_to   timestamptz;