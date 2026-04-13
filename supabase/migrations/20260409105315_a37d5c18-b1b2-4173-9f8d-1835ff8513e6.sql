
-- Pricing packages (admin-managed)
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  price_label text NOT NULL DEFAULT '',
  olt_range text,
  features text[] DEFAULT '{}',
  is_popular boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON public.packages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage packages"
  ON public.packages FOR ALL
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

-- Landing page content (key-value for hero text, FAQ, etc.)
CREATE TABLE public.landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  content_key text NOT NULL,
  content_value jsonb NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  UNIQUE(section, content_key)
);

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view landing content"
  ON public.landing_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage landing content"
  ON public.landing_content FOR ALL
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

-- Service requests (contact form submissions)
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isp_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  district text NOT NULL,
  service_needed text NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit service request"
  ON public.service_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage service requests"
  ON public.service_requests FOR ALL
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

-- Payments tracking
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  transaction_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

-- Seed default packages
INSERT INTO public.packages (name, price, price_label, olt_range, features, is_popular, sort_order) VALUES
  ('Basic', 699, '৳699 /monthly', '1 to 3 OLT', ARRAY['Real-time ONU Status','Optical Power Monitoring','Smart Search','Dashboard Access'], false, 1),
  ('Standard', 899, '৳899 /monthly', '1 to 5 OLT', ARRAY['Everything in Basic','Switch/POP Monitoring','Fiber-down Detection','Report Export'], false, 2),
  ('Premium', 1699, '৳1,699 /monthly', '1 to 10 OLT', ARRAY['Everything in Standard','Role & Permission System','ONU DB Graph','Multi-branch Support','Telegram Alerts'], true, 3),
  ('Platinum', 2199, '৳2,199 /monthly', '1 to 20 OLT', ARRAY['Everything in Premium','Priority Support','Custom Branding','API Access','Dedicated Agent'], false, 4),
  ('Dedicated', 0, 'Custom', 'Unlimited', ARRAY['Everything in Platinum','On-premise Deployment','Custom Development','24/7 Phone Support','SLA Guarantee'], false, 5);

-- Seed FAQ content
INSERT INTO public.landing_content (section, content_key, content_value, sort_order) VALUES
  ('faq', 'faq_1', '{"question": "What is FiberWatch?", "answer": "FiberWatch is a real-time ISP monitoring platform that helps you track ONU status, optical power levels, and network health across all your OLT devices."}', 1),
  ('faq', 'faq_2', '{"question": "Which OLT brands are supported?", "answer": "We support Huawei, BDCOM, VSOL, C-DATA, DBC, and more. Our platform is continuously expanding vendor support."}', 2),
  ('faq', 'faq_3', '{"question": "How does the monitoring agent work?", "answer": "A lightweight agent runs on your local network and securely pushes data to our cloud platform via API. This keeps your device credentials safe while enabling real-time monitoring."}', 3),
  ('faq', 'faq_4', '{"question": "Can I get alerts on Telegram?", "answer": "Yes! Premium and above plans include Telegram bot integration for instant fiber-down and critical power alerts."}', 4),
  ('faq', 'faq_5', '{"question": "Is there a free trial?", "answer": "Contact us to arrange a demo and trial period. We will set up a test environment for your ISP to evaluate the platform."}', 5),
  ('hero', 'main', '{"title": "Real-Time ISP Monitoring Platform", "subtitle": "Monitor your OLT devices, track ONU status, detect fiber issues, and get instant alerts — all from one powerful dashboard.", "cta_primary": "See Pricing", "cta_secondary": "Features"}', 1);
