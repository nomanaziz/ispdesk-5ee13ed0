ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS temp_expire_date date,
  ADD COLUMN IF NOT EXISTS temp_expire_note text;