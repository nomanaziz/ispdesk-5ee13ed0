
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'operator');
CREATE TYPE public.olt_vendor AS ENUM ('huawei', 'bdcom', 'vsol');
CREATE TYPE public.connection_type AS ENUM ('telnet', 'ssh');
CREATE TYPE public.device_status AS ENUM ('online', 'offline', 'unknown');
CREATE TYPE public.onu_status AS ENUM ('online', 'offline');
CREATE TYPE public.mapping_status AS ENUM ('mapped', 'unmapped');
CREATE TYPE public.alert_type AS ENUM ('warning', 'critical', 'offline');
CREATE TYPE public.alert_channel AS ENUM ('dashboard', 'telegram');

-- Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is super_admin or admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Helper: get user's branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = _user_id
$$;

-- OLT Devices
CREATE TABLE public.olt_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor public.olt_vendor NOT NULL DEFAULT 'huawei',
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 23,
  connection_type public.connection_type NOT NULL DEFAULT 'telnet',
  branch_id UUID REFERENCES public.branches(id),
  status public.device_status NOT NULL DEFAULT 'unknown',
  credentials_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.olt_devices ENABLE ROW LEVEL SECURITY;

-- MikroTik Devices
CREATE TABLE public.mikrotik_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  api_port INTEGER NOT NULL DEFAULT 8728,
  branch_id UUID REFERENCES public.branches(id),
  status public.device_status NOT NULL DEFAULT 'unknown',
  credentials_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mikrotik_devices ENABLE ROW LEVEL SECURITY;

-- ONU List
CREATE TABLE public.onu_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  olt_id UUID NOT NULL REFERENCES public.olt_devices(id) ON DELETE CASCADE,
  interface TEXT,
  mac TEXT,
  serial_number TEXT,
  description TEXT,
  status public.onu_status NOT NULL DEFAULT 'offline',
  rx_power NUMERIC,
  tx_power NUMERIC,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onu_list ENABLE ROW LEVEL SECURITY;

-- User-ONU Mapping
CREATE TABLE public.user_onu_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ppp_username TEXT NOT NULL,
  caller_id_mac TEXT NOT NULL,
  onu_id UUID REFERENCES public.onu_list(id) ON DELETE SET NULL,
  status public.mapping_status NOT NULL DEFAULT 'unmapped',
  mapped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_onu_mapping ENABLE ROW LEVEL SECURITY;

-- ONU History
CREATE TABLE public.onu_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id UUID NOT NULL REFERENCES public.onu_list(id) ON DELETE CASCADE,
  rx_power NUMERIC,
  tx_power NUMERIC,
  status public.onu_status,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onu_history ENABLE ROW LEVEL SECURITY;

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id UUID REFERENCES public.onu_list(id) ON DELETE SET NULL,
  type public.alert_type NOT NULL,
  message TEXT NOT NULL,
  rx_power NUMERIC,
  is_read BOOLEAN NOT NULL DEFAULT false,
  channel public.alert_channel NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Scheduler Config
CREATE TABLE public.scheduler_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('olt', 'mikrotik')),
  interval_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduler_config ENABLE ROW LEVEL SECURITY;

-- OLT Permissions (which operator can see which OLT)
CREATE TABLE public.olt_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  olt_id UUID NOT NULL REFERENCES public.olt_devices(id) ON DELETE CASCADE,
  UNIQUE(user_id, olt_id)
);
ALTER TABLE public.olt_permissions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_onu_list_olt_id ON public.onu_list(olt_id);
CREATE INDEX idx_onu_list_mac ON public.onu_list(mac);
CREATE INDEX idx_onu_history_onu_id ON public.onu_history(onu_id);
CREATE INDEX idx_onu_history_recorded_at ON public.onu_history(recorded_at);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX idx_user_onu_mapping_mac ON public.user_onu_mapping(caller_id_mac);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_olt_devices_updated_at
  BEFORE UPDATE ON public.olt_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mikrotik_devices_updated_at
  BEFORE UPDATE ON public.mikrotik_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- Branches: authenticated can read, admins can manage
CREATE POLICY "Authenticated users can view branches" ON public.branches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- User Roles: only super_admins can manage
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- OLT Devices: super_admin sees all, admin sees branch, operator sees permitted
CREATE POLICY "Super admins see all OLTs" ON public.olt_devices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins see branch OLTs" ON public.olt_devices
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') AND branch_id = public.get_user_branch(auth.uid())
  );
CREATE POLICY "Operators see permitted OLTs" ON public.olt_devices
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'operator') AND id IN (
      SELECT olt_id FROM public.olt_permissions WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage OLTs" ON public.olt_devices
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- MikroTik Devices: same pattern
CREATE POLICY "Super admins see all MikroTik" ON public.mikrotik_devices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins see branch MikroTik" ON public.mikrotik_devices
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') AND branch_id = public.get_user_branch(auth.uid())
  );
CREATE POLICY "Admins can manage MikroTik" ON public.mikrotik_devices
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ONU List: visible based on OLT access
CREATE POLICY "Users see ONUs of accessible OLTs" ON public.onu_list
  FOR SELECT TO authenticated USING (
    olt_id IN (SELECT id FROM public.olt_devices)
  );
CREATE POLICY "Admins can manage ONUs" ON public.onu_list
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- User ONU Mapping
CREATE POLICY "Authenticated can view mappings" ON public.user_onu_mapping
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mappings" ON public.user_onu_mapping
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ONU History
CREATE POLICY "Authenticated can view history" ON public.onu_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert history" ON public.onu_history
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Alerts
CREATE POLICY "Authenticated can view alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update own alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can manage alerts" ON public.alerts
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- Scheduler Config
CREATE POLICY "Admins can manage scheduler" ON public.scheduler_config
  FOR ALL TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view scheduler" ON public.scheduler_config
  FOR SELECT TO authenticated USING (true);

-- OLT Permissions
CREATE POLICY "Super admins manage permissions" ON public.olt_permissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can view own permissions" ON public.olt_permissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Enable Realtime on alerts and onu_list
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onu_list;
