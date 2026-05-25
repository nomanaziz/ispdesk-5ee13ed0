ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS data_source_priority text NOT NULL DEFAULT 'agent_first'
    CHECK (data_source_priority IN ('agent_first','snmp_first','agent_only','snmp_only')),
  ADD COLUMN IF NOT EXISTS agent_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS snmp_fallback_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agent_stale_seconds integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS last_data_source text,
  ADD COLUMN IF NOT EXISTS agent_last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS snmp_last_seen timestamptz;

ALTER TABLE public.onu_list
  ADD COLUMN IF NOT EXISTS last_data_source text;