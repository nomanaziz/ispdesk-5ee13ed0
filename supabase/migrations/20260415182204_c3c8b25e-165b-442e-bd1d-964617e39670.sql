
ALTER TABLE public.client_schedulers
  ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.mikrotik_devices(id),
  ADD COLUMN IF NOT EXISTS protocol_type TEXT,
  ADD COLUMN IF NOT EXISTS profile_speed TEXT,
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.isp_packages(id),
  ADD COLUMN IF NOT EXISTS package_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS execution_time TEXT;
