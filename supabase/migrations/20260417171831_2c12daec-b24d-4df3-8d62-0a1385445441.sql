ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_client_id ON public.shop_orders(client_id);