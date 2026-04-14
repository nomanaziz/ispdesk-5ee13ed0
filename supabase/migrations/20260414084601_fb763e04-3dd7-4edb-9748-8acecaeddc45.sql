
-- Alter bw_categories: add parent_id for hierarchy
ALTER TABLE public.bw_categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.bw_categories(id) ON DELETE SET NULL;

-- Alter bw_providers: add logo_url, address, mobile
ALTER TABLE public.bw_providers ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.bw_providers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.bw_providers ADD COLUMN IF NOT EXISTS mobile text;

-- Alter bw_items: add description
ALTER TABLE public.bw_items ADD COLUMN IF NOT EXISTS description text;

-- Alter bw_purchase_bills: add extra fields
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS billing_month text;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS payment_due date;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS invoice_no text;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;
ALTER TABLE public.bw_purchase_bills ADD COLUMN IF NOT EXISTS remarks text;

-- Create bw_bill_items table
CREATE TABLE IF NOT EXISTS public.bw_bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bw_purchase_bills(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.bw_items(id) ON DELETE SET NULL,
  description text,
  unit text DEFAULT 'Mbps',
  quantity numeric DEFAULT 1,
  rate numeric DEFAULT 0,
  vat_percent numeric DEFAULT 0,
  from_date date,
  to_date date,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bw_bill_items" ON public.bw_bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bw_bill_items" ON public.bw_bill_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bw_bill_items" ON public.bw_bill_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete bw_bill_items" ON public.bw_bill_items FOR DELETE TO authenticated USING (true);

-- Seed predefined categories
INSERT INTO public.bw_categories (name, status) VALUES
  ('INT', 'active'),
  ('IIG', 'active'),
  ('FNA', 'active'),
  ('GGC', 'active'),
  ('M-CDN', 'active'),
  ('B-CDN', 'active'),
  ('BDIX', 'active'),
  ('NIX', 'active'),
  ('IX', 'active'),
  ('DATA', 'active'),
  ('NTTN', 'active')
ON CONFLICT DO NOTHING;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('bw-provider-logos', 'bw-provider-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('bw-bill-attachments', 'bw-bill-attachments', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for bw-provider-logos
CREATE POLICY "Public read bw-provider-logos" ON storage.objects FOR SELECT USING (bucket_id = 'bw-provider-logos');
CREATE POLICY "Auth upload bw-provider-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bw-provider-logos');
CREATE POLICY "Auth update bw-provider-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bw-provider-logos');
CREATE POLICY "Auth delete bw-provider-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bw-provider-logos');

-- Storage policies for bw-bill-attachments
CREATE POLICY "Public read bw-bill-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'bw-bill-attachments');
CREATE POLICY "Auth upload bw-bill-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bw-bill-attachments');
CREATE POLICY "Auth update bw-bill-attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bw-bill-attachments');
CREATE POLICY "Auth delete bw-bill-attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bw-bill-attachments');
