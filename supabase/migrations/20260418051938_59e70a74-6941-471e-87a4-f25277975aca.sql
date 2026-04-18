ALTER TABLE public.public_payment_requests ADD COLUMN IF NOT EXISTS gateway_response jsonb;
ALTER TABLE public.public_payment_requests ADD COLUMN IF NOT EXISTS billing_id uuid REFERENCES public.billing(id) ON DELETE SET NULL;
ALTER TABLE public.public_payment_requests ADD COLUMN IF NOT EXISTS gateway_payment_id text;
CREATE INDEX IF NOT EXISTS idx_ppr_gateway_payment_id ON public.public_payment_requests(gateway_payment_id);