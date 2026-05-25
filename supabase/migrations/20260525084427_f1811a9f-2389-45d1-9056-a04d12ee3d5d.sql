
ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS last_offline_reason text;

CREATE INDEX IF NOT EXISTS idx_olt_devices_branch_status ON public.olt_devices(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_olt_devices_last_seen ON public.olt_devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_created ON public.alerts(type, created_at DESC);
