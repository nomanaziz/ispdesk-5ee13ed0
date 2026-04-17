-- 1. Services catalog
CREATE TABLE public.bw_sale_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  unit TEXT NOT NULL DEFAULT 'Mbps',
  default_rate NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read services" ON public.bw_sale_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write services" ON public.bw_sale_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Customer subscriptions (per-service active lines)
CREATE TABLE public.bw_customer_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.bw_sale_services(id) ON DELETE RESTRICT,
  bandwidth_mbps NUMERIC NOT NULL DEFAULT 0,
  rate_per_mbps NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bw_subs_customer ON public.bw_customer_subscriptions(customer_id);
CREATE INDEX idx_bw_subs_service ON public.bw_customer_subscriptions(service_id);
CREATE INDEX idx_bw_subs_status ON public.bw_customer_subscriptions(status);

ALTER TABLE public.bw_customer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read subs" ON public.bw_customer_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write subs" ON public.bw_customer_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Service change log (upgrade/downgrade audit)
CREATE TABLE public.bw_service_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.bw_sale_services(id) ON DELETE RESTRICT,
  old_subscription_id UUID REFERENCES public.bw_customer_subscriptions(id) ON DELETE SET NULL,
  new_subscription_id UUID REFERENCES public.bw_customer_subscriptions(id) ON DELETE SET NULL,
  old_mbps NUMERIC,
  new_mbps NUMERIC,
  old_rate NUMERIC,
  new_rate NUMERIC,
  effective_date DATE NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'upgrade',
  reason TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bw_chg_customer ON public.bw_service_change_log(customer_id);
CREATE INDEX idx_bw_chg_effective ON public.bw_service_change_log(effective_date);

ALTER TABLE public.bw_service_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read chg" ON public.bw_service_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write chg" ON public.bw_service_change_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Invoice line items
CREATE TABLE public.bw_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.bw_sales_invoices(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.bw_customer_subscriptions(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.bw_sale_services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  bandwidth_mbps NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 0,
  total_days_in_month INTEGER NOT NULL DEFAULT 30,
  amount NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bw_items_invoice ON public.bw_invoice_items(invoice_id);
CREATE INDEX idx_bw_items_service ON public.bw_invoice_items(service_id);

ALTER TABLE public.bw_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read items" ON public.bw_invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write items" ON public.bw_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Extend invoice header
ALTER TABLE public.bw_sales_invoices
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;

-- 6. updated_at triggers
CREATE TRIGGER bw_sale_services_updated BEFORE UPDATE ON public.bw_sale_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bw_customer_subscriptions_updated BEFORE UPDATE ON public.bw_customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Seed common services
INSERT INTO public.bw_sale_services (name, code, unit, default_rate, sort_order) VALUES
  ('Internet/IIG', 'IIG', 'Mbps', 300, 1),
  ('NIX/BTCL', 'NIX', 'Mbps', 100, 2),
  ('Facebook Cache', 'FB', 'Mbps', 50, 3),
  ('Akamai Cache', 'AKM', 'Mbps', 50, 4),
  ('Google Cache (GGC)', 'GGC', 'Mbps', 50, 5),
  ('DHC', 'DHC', 'Mbps', 80, 6),
  ('Afan', 'AFN', 'Mbps', 80, 7);