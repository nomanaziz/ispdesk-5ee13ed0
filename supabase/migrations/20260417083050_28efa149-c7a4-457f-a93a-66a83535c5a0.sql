
-- ============ SHOP CATEGORIES ============
CREATE TABLE public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SHOP PRODUCTS ============
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  brand TEXT,
  short_desc TEXT,
  long_desc TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(12,2),
  stock INT NOT NULL DEFAULT 0,
  low_stock_alert INT NOT NULL DEFAULT 5,
  unit TEXT DEFAULT 'pcs',
  weight_kg NUMERIC(10,3) DEFAULT 0,
  warranty_months INT NOT NULL DEFAULT 12,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SHOP ORDERS ============
CREATE SEQUENCE IF NOT EXISTS public.shop_order_no_seq START 1001;

CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  thana TEXT,
  area TEXT,
  inside_dhaka BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'pending',
  trx_id TEXT,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_orders_status ON public.shop_orders(order_status);
CREATE INDEX idx_shop_orders_payment ON public.shop_orders(payment_status);
CREATE INDEX idx_shop_orders_mobile ON public.shop_orders(mobile);

-- ============ SHOP ORDER ITEMS ============
CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  sku TEXT,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  warranty_months INT NOT NULL DEFAULT 0,
  warranty_start DATE,
  warranty_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);

-- ============ SHIPPING ZONES ============
CREATE TABLE public.shop_shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.shop_shipping_zones (name, charge, is_default) VALUES
  ('Inside Dhaka', 80, true),
  ('Outside Dhaka', 150, false);

-- ============ COUPONS ============
CREATE TABLE public.shop_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'fixed',
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order NUMERIC(12,2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  used INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ WARRANTY CLAIMS ============
CREATE SEQUENCE IF NOT EXISTS public.warranty_claim_no_seq START 1001;

CREATE TABLE public.warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_no TEXT NOT NULL UNIQUE,
  order_item_id UUID NOT NULL REFERENCES public.shop_order_items(id) ON DELETE CASCADE,
  customer_name TEXT,
  mobile TEXT,
  issue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  admin_note TEXT,
  resolution_type TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============

-- updated_at triggers
CREATE TRIGGER trg_shop_categories_upd BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_products_upd BEFORE UPDATE ON public.shop_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_orders_upd BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warranty_claims_upd BEFORE UPDATE ON public.warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto order_no
CREATE OR REPLACE FUNCTION public.set_shop_order_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := 'ORD-' || lpad(nextval('public.shop_order_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shop_orders_no BEFORE INSERT ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_order_no();

-- Auto claim_no
CREATE OR REPLACE FUNCTION public.set_warranty_claim_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.claim_no IS NULL OR NEW.claim_no = '' THEN
    NEW.claim_no := 'WC-' || lpad(nextval('public.warranty_claim_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_warranty_claim_no BEFORE INSERT ON public.warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_warranty_claim_no();

-- Activate warranty when order paid
CREATE OR REPLACE FUNCTION public.activate_warranty_on_paid()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    UPDATE public.shop_order_items
    SET warranty_start = CURRENT_DATE,
        warranty_end = CURRENT_DATE + (warranty_months || ' months')::interval
    WHERE order_id = NEW.id AND warranty_months > 0 AND warranty_start IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activate_warranty AFTER UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.activate_warranty_on_paid();

-- ============ RLS ============
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY "categories_public_read" ON public.shop_categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_all" ON public.shop_categories FOR ALL
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Products: public read active, admin all
CREATE POLICY "products_public_read" ON public.shop_products FOR SELECT USING (true);
CREATE POLICY "products_admin_all" ON public.shop_products FOR ALL
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Shipping zones: public read, admin write
CREATE POLICY "zones_public_read" ON public.shop_shipping_zones FOR SELECT USING (true);
CREATE POLICY "zones_admin_all" ON public.shop_shipping_zones FOR ALL
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Coupons: public read active (for validation), admin write
CREATE POLICY "coupons_public_read" ON public.shop_coupons FOR SELECT USING (status = 'active');
CREATE POLICY "coupons_admin_all" ON public.shop_coupons FOR ALL
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Orders: anyone can insert (guest checkout), public can read by id, admin all
CREATE POLICY "orders_public_insert" ON public.shop_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_public_read" ON public.shop_orders FOR SELECT USING (true);
CREATE POLICY "orders_admin_update" ON public.shop_orders FOR UPDATE
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "orders_admin_delete" ON public.shop_orders FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

-- Order items: same as orders
CREATE POLICY "order_items_public_insert" ON public.shop_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_public_read" ON public.shop_order_items FOR SELECT USING (true);
CREATE POLICY "order_items_admin_update" ON public.shop_order_items FOR UPDATE
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "order_items_admin_delete" ON public.shop_order_items FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

-- Warranty claims: public can insert and read, admin manages
CREATE POLICY "claims_public_insert" ON public.warranty_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "claims_public_read" ON public.warranty_claims FOR SELECT USING (true);
CREATE POLICY "claims_admin_update" ON public.warranty_claims FOR UPDATE
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "claims_admin_delete" ON public.warranty_claims FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-products', 'shop-products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "shop_products_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-products');
CREATE POLICY "shop_products_admin_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-products' AND public.is_admin_or_super(auth.uid()));
CREATE POLICY "shop_products_admin_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'shop-products' AND public.is_admin_or_super(auth.uid()));
CREATE POLICY "shop_products_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'shop-products' AND public.is_admin_or_super(auth.uid()));
