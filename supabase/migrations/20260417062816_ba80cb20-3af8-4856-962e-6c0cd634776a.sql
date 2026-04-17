-- Provider subscriptions (buy-side service lines)
CREATE TABLE public.bw_buy_provider_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.bw_providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.bw_sale_services(id),
  service_name TEXT NOT NULL,
  bandwidth_mbps NUMERIC NOT NULL DEFAULT 0,
  rate_per_mbps NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_buy_provider_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bw_buy_provider_subscriptions"
  ON public.bw_buy_provider_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write bw_buy_provider_subscriptions"
  ON public.bw_buy_provider_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_bw_buy_provider_subs_updated
  BEFORE UPDATE ON public.bw_buy_provider_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bw_buy_provider_subs_provider ON public.bw_buy_provider_subscriptions(provider_id);
CREATE INDEX idx_bw_buy_provider_subs_status ON public.bw_buy_provider_subscriptions(status);

-- Service change log (buy-side)
CREATE TABLE public.bw_buy_service_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.bw_providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.bw_sale_services(id),
  old_subscription_id UUID,
  new_subscription_id UUID,
  old_mbps NUMERIC,
  new_mbps NUMERIC,
  old_rate NUMERIC,
  new_rate NUMERIC,
  effective_date DATE NOT NULL,
  change_type TEXT,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_buy_service_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bw_buy_service_change_log"
  ON public.bw_buy_service_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write bw_buy_service_change_log"
  ON public.bw_buy_service_change_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_bw_buy_change_log_provider ON public.bw_buy_service_change_log(provider_id);
CREATE INDEX idx_bw_buy_change_log_date ON public.bw_buy_service_change_log(effective_date);

-- Bill line items (pro-rated breakdown)
CREATE TABLE public.bw_buy_bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bw_purchase_bills(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.bw_buy_provider_subscriptions(id),
  service_id UUID REFERENCES public.bw_sale_services(id),
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

ALTER TABLE public.bw_buy_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bw_buy_bill_items"
  ON public.bw_buy_bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write bw_buy_bill_items"
  ON public.bw_buy_bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_bw_buy_bill_items_bill ON public.bw_buy_bill_items(bill_id);

-- Extend bw_purchase_bills
ALTER TABLE public.bw_purchase_bills
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;