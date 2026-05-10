ALTER TABLE public.public_payment_requests
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'bill',
  ADD COLUMN IF NOT EXISTS recharge_days integer;