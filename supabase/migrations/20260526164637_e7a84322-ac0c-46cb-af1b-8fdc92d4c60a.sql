
ALTER TABLE public.zkteco_devices
  ADD COLUMN IF NOT EXISTS connection_type text NOT NULL DEFAULT 'tcp_ip',
  ADD COLUMN IF NOT EXISTS comm_key int NOT NULL DEFAULT 0;

ALTER TABLE public.zkteco_devices
  ALTER COLUMN ip_address DROP NOT NULL,
  ALTER COLUMN port DROP NOT NULL;
