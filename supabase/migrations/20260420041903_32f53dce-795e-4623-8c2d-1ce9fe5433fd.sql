-- Add new columns to reseller_tariffs for multi-package support
ALTER TABLE public.reseller_tariffs 
  ADD COLUMN IF NOT EXISTS tariff_type text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Make legacy single-package columns nullable (kept for backward compat)
ALTER TABLE public.reseller_tariffs 
  ALTER COLUMN package_id DROP NOT NULL,
  ALTER COLUMN selling_rate DROP NOT NULL,
  ALTER COLUMN activation_days DROP NOT NULL;

-- Create child table: reseller_tariff_packages
CREATE TABLE IF NOT EXISTS public.reseller_tariff_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid NOT NULL REFERENCES public.reseller_tariffs(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.isp_packages(id) ON DELETE RESTRICT,
  mikrotik_server_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE SET NULL,
  mikrotik_profile text,
  protocol_type text NOT NULL DEFAULT 'PPPoE',
  buy_rate numeric NOT NULL DEFAULT 0,
  selling_rate numeric NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 30,
  min_activation_days integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tariff_id, package_id, mikrotik_server_id)
);

CREATE INDEX IF NOT EXISTS idx_rtp_tariff ON public.reseller_tariff_packages(tariff_id);
CREATE INDEX IF NOT EXISTS idx_rtp_package ON public.reseller_tariff_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_rtp_server ON public.reseller_tariff_packages(mikrotik_server_id);

-- Enable RLS
ALTER TABLE public.reseller_tariff_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies — admins/super_admins manage; authenticated can read
CREATE POLICY "Admins manage tariff packages"
  ON public.reseller_tariff_packages
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated read tariff packages"
  ON public.reseller_tariff_packages
  FOR SELECT
  TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER trg_rtp_updated_at
  BEFORE UPDATE ON public.reseller_tariff_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing reseller_tariffs single-package rows into child table
INSERT INTO public.reseller_tariff_packages (
  tariff_id, package_id, mikrotik_server_id, mikrotik_profile,
  protocol_type, buy_rate, selling_rate, validity_days, min_activation_days
)
SELECT
  rt.id,
  rt.package_id,
  rt.mikrotik_server_id,
  rt.mikrotik_profile,
  COALESCE(rt.protocol_type, 'PPPoE'),
  COALESCE(ip.price, 0),
  COALESCE(rt.selling_rate, 0),
  COALESCE(rt.activation_days, 30),
  COALESCE(rt.min_activation_days, 1)
FROM public.reseller_tariffs rt
LEFT JOIN public.isp_packages ip ON ip.id = rt.package_id
WHERE rt.package_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.reseller_tariff_packages rtp
    WHERE rtp.tariff_id = rt.id AND rtp.package_id = rt.package_id
      AND COALESCE(rtp.mikrotik_server_id::text, '') = COALESCE(rt.mikrotik_server_id::text, '')
  );