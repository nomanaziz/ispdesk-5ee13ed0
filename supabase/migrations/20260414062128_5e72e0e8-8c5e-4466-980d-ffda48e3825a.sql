
CREATE TABLE public.pop_ip_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id uuid REFERENCES public.pop_devices(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  subnet text,
  gateway text,
  status text NOT NULL DEFAULT 'active',
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pop_ip_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pop_ip_addresses" ON public.pop_ip_addresses FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view pop_ip_addresses" ON public.pop_ip_addresses FOR SELECT TO authenticated USING (true);

CREATE TABLE public.service_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage service_types" ON public.service_types FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view service_types" ON public.service_types FOR SELECT TO authenticated USING (true);
