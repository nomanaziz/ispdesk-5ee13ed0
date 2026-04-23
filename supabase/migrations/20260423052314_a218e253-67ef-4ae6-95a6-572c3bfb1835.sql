ALTER TABLE public.bw_providers ADD COLUMN IF NOT EXISTS default_vat_pct numeric NOT NULL DEFAULT 5;
ALTER TABLE public.bw_buy_provider_subscriptions ADD COLUMN IF NOT EXISTS vat_pct numeric NOT NULL DEFAULT 5;
ALTER TABLE public.bw_items ADD COLUMN IF NOT EXISTS default_vat_pct numeric NOT NULL DEFAULT 5;
ALTER TABLE public.bw_buy_bill_items ADD COLUMN IF NOT EXISTS vat_pct numeric NOT NULL DEFAULT 5;
ALTER TABLE public.bw_buy_bill_items ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS vat_total numeric NOT NULL DEFAULT 0;