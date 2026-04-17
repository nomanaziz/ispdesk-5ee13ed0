
-- Sub-users for bandwidth resellers (each row = a sub-account that logs in under a parent reseller)
CREATE TABLE IF NOT EXISTS public.bw_reseller_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  mobile TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB NOT NULL DEFAULT '{"dashboard":true,"invoices":true,"purchases":true,"tickets":true,"users":false,"settings":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bw_reseller_users_reseller ON public.bw_reseller_users(reseller_id);

ALTER TABLE public.bw_reseller_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bw reseller users" ON public.bw_reseller_users;
CREATE POLICY "Admins manage bw reseller users"
ON public.bw_reseller_users
FOR ALL
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Service role bypasses RLS automatically; portal-auth edge function uses service role for lookup.

CREATE TRIGGER set_bw_reseller_users_updated_at
BEFORE UPDATE ON public.bw_reseller_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase orders raised by bandwidth resellers
CREATE TABLE IF NOT EXISTS public.bw_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  reseller_id UUID NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  billing_month TEXT,
  note TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bw_purchase_orders_reseller ON public.bw_purchase_orders(reseller_id);

ALTER TABLE public.bw_purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bw purchase orders" ON public.bw_purchase_orders;
CREATE POLICY "Admins manage bw purchase orders"
ON public.bw_purchase_orders
FOR ALL
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER set_bw_purchase_orders_updated_at
BEFORE UPDATE ON public.bw_purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.bw_purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.bw_purchase_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL DEFAULT 0,
  vat_percent NUMERIC NOT NULL DEFAULT 0,
  from_date DATE,
  to_date DATE,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bw_purchase_order_items_order ON public.bw_purchase_order_items(order_id);

ALTER TABLE public.bw_purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bw purchase order items" ON public.bw_purchase_order_items;
CREATE POLICY "Admins manage bw purchase order items"
ON public.bw_purchase_order_items
FOR ALL
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));
