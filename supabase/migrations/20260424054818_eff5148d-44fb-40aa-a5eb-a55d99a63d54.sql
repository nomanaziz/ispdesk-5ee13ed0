ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS trade_license_no text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS static_ip text,
  ADD COLUMN IF NOT EXISTS routing_protocol text,
  ADD COLUMN IF NOT EXISTS bgp_as_number text,
  ADD COLUMN IF NOT EXISTS peer_ip text,
  ADD COLUMN IF NOT EXISTS bandwidth_committed_mbps numeric,
  ADD COLUMN IF NOT EXISTS bandwidth_burst_mbps numeric,
  ADD COLUMN IF NOT EXISTS sla_uptime_percent numeric;