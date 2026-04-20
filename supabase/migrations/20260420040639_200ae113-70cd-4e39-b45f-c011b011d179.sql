ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cable_recovered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_recovered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS recovered_by uuid NULL,
  ADD COLUMN IF NOT EXISTS recovered_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS recovery_remarks text NULL;