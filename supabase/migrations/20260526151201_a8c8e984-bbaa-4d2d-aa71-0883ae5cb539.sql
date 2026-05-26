ALTER TABLE public.olt_ports
  ADD COLUMN IF NOT EXISTS admin_status text,
  ADD COLUMN IF NOT EXISTS oper_status text,
  ADD COLUMN IF NOT EXISTS speed_mbps integer,
  ADD COLUMN IF NOT EXISTS total_onus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_onus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rx_power_dbm numeric,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;