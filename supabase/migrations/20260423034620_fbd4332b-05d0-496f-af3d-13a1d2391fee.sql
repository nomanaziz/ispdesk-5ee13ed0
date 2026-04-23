
-- Categories
CREATE TABLE public.important_link_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'Folder',
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.important_link_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view categories"
ON public.important_link_categories FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins can insert categories"
ON public.important_link_categories FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update categories"
ON public.important_link_categories FOR UPDATE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete categories"
ON public.important_link_categories FOR DELETE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_important_link_categories_updated_at
BEFORE UPDATE ON public.important_link_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Links
CREATE TABLE public.important_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.important_link_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  icon_url text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.important_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view links"
ON public.important_links FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins can insert links"
ON public.important_links FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update links"
ON public.important_links FOR UPDATE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete links"
ON public.important_links FOR DELETE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_important_links_updated_at
BEFORE UPDATE ON public.important_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_important_links_category ON public.important_links(category_id);

-- Storage bucket for icons
INSERT INTO storage.buckets (id, name, public) VALUES ('important-link-icons', 'important-link-icons', true);

CREATE POLICY "Public can view link icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'important-link-icons');

CREATE POLICY "Admins can upload link icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'important-link-icons' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update link icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'important-link-icons' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete link icons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'important-link-icons' AND public.is_admin_or_super(auth.uid()));

-- Seed default categories and example links
INSERT INTO public.important_link_categories (id, name, icon, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Support & Billing', 'Wallet', 1),
  ('22222222-2222-2222-2222-222222222222', 'Monitoring Tools', 'Activity', 2),
  ('33333333-3333-3333-3333-333333333333', 'POP OLT IP', 'Server', 3);

INSERT INTO public.important_links (category_id, title, url, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Billing Software', 'https://example.com/billing', 1),
  ('11111111-1111-1111-1111-111111111111', 'ONU Config', 'https://example.com/onu', 2),
  ('11111111-1111-1111-1111-111111111111', 'Mail Admin', 'https://example.com/mail', 3),
  ('22222222-2222-2222-2222-222222222222', 'Log Server', 'https://example.com/log', 1),
  ('22222222-2222-2222-2222-222222222222', 'Cacti', 'https://example.com/cacti', 2),
  ('22222222-2222-2222-2222-222222222222', 'Uptime Kuma', 'https://example.com/uptime', 3),
  ('33333333-3333-3333-3333-333333333333', 'OLT-1 Web', 'http://192.168.1.1', 1);
