-- 1. website_templates
CREATE TABLE public.website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  template_key text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, template_key)
);

CREATE UNIQUE INDEX website_templates_one_active_per_page
  ON public.website_templates (page_key)
  WHERE is_active = true;

ALTER TABLE public.website_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view website templates"
  ON public.website_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage website templates - insert"
  ON public.website_templates FOR INSERT
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage website templates - update"
  ON public.website_templates FOR UPDATE
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage website templates - delete"
  ON public.website_templates FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_website_templates_updated_at
  BEFORE UPDATE ON public.website_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. website_dedicated_packages
CREATE TABLE public.website_dedicated_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bandwidth_label text,
  price_label text NOT NULL DEFAULT 'Call for Price',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  badges text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_popular boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  contact_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_dedicated_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active dedicated packages"
  ON public.website_dedicated_packages FOR SELECT
  USING (status = 'active' OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage dedicated packages - insert"
  ON public.website_dedicated_packages FOR INSERT
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage dedicated packages - update"
  ON public.website_dedicated_packages FOR UPDATE
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage dedicated packages - delete"
  ON public.website_dedicated_packages FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_website_dedicated_packages_updated_at
  BEFORE UPDATE ON public.website_dedicated_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed default templates (5 home + 5 packages, classic active)
INSERT INTO public.website_templates (page_key, template_key, name, is_active, config) VALUES
  ('home', 'classic',    'Classic Cyan',     true,  '{"accent":"cyan","heroAlign":"left","cardStyle":"rounded"}'::jsonb),
  ('home', 'split-hero', 'Split Hero',       false, '{"accent":"blue","heroAlign":"left","cardStyle":"rounded"}'::jsonb),
  ('home', 'centered',   'Centered Bold',    false, '{"accent":"violet","heroAlign":"center","cardStyle":"rounded"}'::jsonb),
  ('home', 'left-rail',  'Left Rail',        false, '{"accent":"emerald","heroAlign":"left","cardStyle":"sharp"}'::jsonb),
  ('home', 'minimal',    'Minimal',          false, '{"accent":"slate","heroAlign":"center","cardStyle":"rounded"}'::jsonb),
  ('packages', 'classic',  'Classic Tabs',    true,  '{"accent":"cyan"}'::jsonb),
  ('packages', 'galaxy',   'Galaxy Style',    false, '{"accent":"orange"}'::jsonb),
  ('packages', 'compact',  'Compact Grid',    false, '{"accent":"cyan"}'::jsonb),
  ('packages', 'cardflip', 'Card Flip',       false, '{"accent":"violet"}'::jsonb),
  ('packages', 'table',    'Comparison Table',false, '{"accent":"slate"}'::jsonb);

-- 4. Seed sample dedicated packages
INSERT INTO public.website_dedicated_packages (name, bandwidth_label, price_label, features, badges, is_popular, sort_order) VALUES
  ('Enterprise Starter',  '50 Mbps Symmetric',  'Call for Price', '["Real IP","SLA 99.5%","24/7 Support"]'::jsonb, ARRAY['BDIX','FTP','Real IP'], false, 1),
  ('Business Pro',        '100 Mbps Symmetric', 'Call for Price', '["Real IP","SLA 99.9%","Priority Support","Free Router"]'::jsonb, ARRAY['BDIX','FTP','Cache','Real IP'], true, 2),
  ('Corporate Premium',   '200 Mbps Symmetric', 'Call for Price', '["Multiple Real IPs","SLA 99.9%","Dedicated Engineer","Backup Link"]'::jsonb, ARRAY['BDIX','FTP','Cache','Real IP','SLA'], false, 3);
