
-- Zones
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  branch_id uuid REFERENCES public.branches(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view zones" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage zones" ON public.zones FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Sub Zones
CREATE TABLE public.sub_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.zones(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sub_zones" ON public.sub_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sub_zones" ON public.sub_zones FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- ISP Packages
CREATE TABLE public.isp_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  bandwidth_down integer DEFAULT 0,
  bandwidth_up integer DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  setup_fee numeric DEFAULT 0,
  protocol text DEFAULT 'PPPoE',
  mikrotik_id uuid REFERENCES public.mikrotik_devices(id),
  mikrotik_profile text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.isp_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view isp_packages" ON public.isp_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage isp_packages" ON public.isp_packages FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Client Types
CREATE TABLE public.client_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_types" ON public.client_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage client_types" ON public.client_types FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Protocol Types
CREATE TABLE public.protocol_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view protocol_types" ON public.protocol_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage protocol_types" ON public.protocol_types FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Connection Types Config
CREATE TABLE public.connection_types_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.connection_types_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view connection_types_config" ON public.connection_types_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage connection_types_config" ON public.connection_types_config FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Billing Statuses
CREATE TABLE public.billing_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#000000',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view billing_statuses" ON public.billing_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage billing_statuses" ON public.billing_statuses FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  user_id text,
  name text NOT NULL,
  contact text,
  email text,
  address text,
  zone_id uuid REFERENCES public.zones(id),
  sub_zone_id uuid REFERENCES public.sub_zones(id),
  mikrotik_id uuid REFERENCES public.mikrotik_devices(id),
  onu_id uuid REFERENCES public.onu_list(id),
  package_id uuid REFERENCES public.isp_packages(id),
  billing_date integer DEFAULT 1,
  monthly_bill numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  connection_type text,
  client_type text,
  branch_id uuid REFERENCES public.branches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Billing
CREATE TABLE public.billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  due numeric DEFAULT 0,
  advance numeric DEFAULT 0,
  due_date date,
  pay_date date,
  extend_date date,
  status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  collected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view billing" ON public.billing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage billing" ON public.billing FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
