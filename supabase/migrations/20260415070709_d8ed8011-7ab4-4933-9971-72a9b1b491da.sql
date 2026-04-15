
-- Create bw_sale_customers table
CREATE TABLE public.bw_sale_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id UUID REFERENCES public.bw_sale_pops(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  contact_person TEXT,
  email TEXT,
  mobile TEXT,
  phone TEXT,
  reference_by TEXT,
  address TEXT,
  remarks TEXT,
  facebook_url TEXT,
  skype_id TEXT,
  website TEXT,
  nttn_info TEXT,
  vlan_info JSONB DEFAULT '[]'::jsonb,
  scr_link_id TEXT,
  activation_date DATE,
  ip_addresses JSONB DEFAULT '[]'::jsonb,
  pop_name_last_mile TEXT,
  username TEXT,
  password TEXT,
  activity_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bw_sale_customers" ON public.bw_sale_customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_bw_sale_customers_updated_at
  BEFORE UPDATE ON public.bw_sale_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create bw_sale_collections table
CREATE TABLE public.bw_sale_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receive_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.bw_sales_invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  received_by TEXT,
  note TEXT,
  payment_method TEXT DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bw_sale_collections" ON public.bw_sale_collections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create bw_sale_recurring table
CREATE TABLE public.bw_sale_recurring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id UUID REFERENCES public.bw_sale_pops(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  repeat_date INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'enabled',
  bill_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bw_sale_recurring" ON public.bw_sale_recurring
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alter bw_sales_invoices to add missing columns
ALTER TABLE public.bw_sales_invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.bw_sale_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by TEXT;
