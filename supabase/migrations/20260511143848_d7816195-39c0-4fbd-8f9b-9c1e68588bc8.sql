ALTER TABLE public.bw_purchase_orders
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS effective_date date;