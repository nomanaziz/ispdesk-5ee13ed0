
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS punch_lat numeric,
  ADD COLUMN IF NOT EXISTS punch_lng numeric,
  ADD COLUMN IF NOT EXISTS punch_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS punch_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS punch_out_at timestamptz;
