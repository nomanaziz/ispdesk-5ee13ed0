
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.destroyed_items
  ADD COLUMN IF NOT EXISTS loss_amount numeric NOT NULL DEFAULT 0;
