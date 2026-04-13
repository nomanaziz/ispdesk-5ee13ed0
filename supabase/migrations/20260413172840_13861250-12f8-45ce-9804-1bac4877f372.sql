
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isp_name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  package_id UUID REFERENCES public.packages(id),
  status TEXT NOT NULL DEFAULT 'pending',
  provisioned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customers"
ON public.customers FOR ALL TO authenticated
USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view customers"
ON public.customers FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
