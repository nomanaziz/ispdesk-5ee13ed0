ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS snmp_ip text,
  ADD COLUMN IF NOT EXISTS snmp_port integer DEFAULT 161,
  ADD COLUMN IF NOT EXISTS snmp_community text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS snmp_version text DEFAULT 'v2c',
  ADD COLUMN IF NOT EXISTS snmp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_model text,
  ADD COLUMN IF NOT EXISTS olt_version text;