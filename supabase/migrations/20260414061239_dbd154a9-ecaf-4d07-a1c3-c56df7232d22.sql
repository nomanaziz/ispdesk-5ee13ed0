
-- Website Pages
CREATE TABLE public.website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  status text NOT NULL DEFAULT 'draft',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_pages" ON public.website_pages FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_pages" ON public.website_pages FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Auth can view website_pages" ON public.website_pages FOR SELECT TO authenticated USING (true);

-- Website Notices
CREATE TABLE public.website_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  publish_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_notices" ON public.website_notices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_notices" ON public.website_notices FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Auth can view website_notices" ON public.website_notices FOR SELECT TO authenticated USING (true);

-- Website Offers
CREATE TABLE public.website_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  discount_text text,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_offers" ON public.website_offers FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_offers" ON public.website_offers FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_offers" ON public.website_offers FOR SELECT TO authenticated USING (true);

-- Website Testimonials
CREATE TABLE public.website_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  designation text,
  company text,
  content text,
  rating integer DEFAULT 5,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_testimonials" ON public.website_testimonials FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_testimonials" ON public.website_testimonials FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_testimonials" ON public.website_testimonials FOR SELECT TO authenticated USING (true);

-- Website Partners
CREATE TABLE public.website_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_partners" ON public.website_partners FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_partners" ON public.website_partners FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_partners" ON public.website_partners FOR SELECT TO authenticated USING (true);

-- Website Features
CREATE TABLE public.website_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_features" ON public.website_features FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_features" ON public.website_features FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_features" ON public.website_features FOR SELECT TO authenticated USING (true);

-- Website Services
CREATE TABLE public.website_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_services" ON public.website_services FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_services" ON public.website_services FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_services" ON public.website_services FOR SELECT TO authenticated USING (true);

-- Website Festivals
CREATE TABLE public.website_festivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_festivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_festivals" ON public.website_festivals FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_festivals" ON public.website_festivals FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_festivals" ON public.website_festivals FOR SELECT TO authenticated USING (true);

-- Website Menu
CREATE TABLE public.website_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  parent_id uuid REFERENCES public.website_menu(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_menu" ON public.website_menu FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active website_menu" ON public.website_menu FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view website_menu" ON public.website_menu FOR SELECT TO authenticated USING (true);

-- Website Media
CREATE TABLE public.website_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  file_type text,
  file_size bigint,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage website_media" ON public.website_media FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Auth can view website_media" ON public.website_media FOR SELECT TO authenticated USING (true);

-- Payment Methods
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'mobile_banking',
  account_number text,
  logo_url text,
  color text DEFAULT '#000000',
  status text NOT NULL DEFAULT 'active',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment_methods" ON public.payment_methods FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Public can view active payment_methods" ON public.payment_methods FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Auth can view payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (true);

-- Add visibility columns to existing tables
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS show_on_website boolean DEFAULT false;
ALTER TABLE public.isp_packages ADD COLUMN IF NOT EXISTS show_on_homepage boolean DEFAULT false;
