ALTER TABLE public.isp_packages
  ADD COLUMN IF NOT EXISTS vat_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_includes_vat boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_vat_breakdown boolean NOT NULL DEFAULT false;