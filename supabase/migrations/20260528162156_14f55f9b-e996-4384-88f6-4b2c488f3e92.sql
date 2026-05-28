ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS pending_approval_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_approval_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS client_online_at_solve boolean;