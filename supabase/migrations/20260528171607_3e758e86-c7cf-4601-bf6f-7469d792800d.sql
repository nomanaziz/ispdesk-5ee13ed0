ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_policy text NULL;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_billing_policy_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_billing_policy_check CHECK (billing_policy IS NULL OR billing_policy IN ('monthly','date_to_date'));