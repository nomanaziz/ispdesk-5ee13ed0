
-- Create enum for POP device type
CREATE TYPE public.pop_device_type AS ENUM ('generator', 'electric');

-- Create enum for pop/switch status
CREATE TYPE public.power_status AS ENUM ('up', 'down', 'unknown');

-- Ping targets table
CREATE TABLE public.ping_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_ping_status TEXT,
  last_ping_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ping_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ping targets" ON public.ping_targets FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view ping targets" ON public.ping_targets FOR SELECT TO authenticated USING (true);

-- POP devices table
CREATE TABLE public.pop_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT,
  type pop_device_type NOT NULL DEFAULT 'electric',
  status power_status NOT NULL DEFAULT 'unknown',
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pop_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pop devices" ON public.pop_devices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view pop devices" ON public.pop_devices FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_pop_devices_updated_at BEFORE UPDATE ON public.pop_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POP logs table
CREATE TABLE public.pop_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id UUID REFERENCES public.pop_devices(id) ON DELETE CASCADE NOT NULL,
  event TEXT NOT NULL,
  status power_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pop_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pop logs" ON public.pop_logs FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view pop logs" ON public.pop_logs FOR SELECT TO authenticated USING (true);

-- System logs table
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  device_name TEXT,
  log_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage system logs" ON public.system_logs FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view system logs" ON public.system_logs FOR SELECT TO authenticated USING (true);

-- Switches table
CREATE TABLE public.switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  status public.device_status NOT NULL DEFAULT 'unknown',
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.switches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage switches" ON public.switches FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view switches" ON public.switches FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_switches_updated_at BEFORE UPDATE ON public.switches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OLT branch shares table
CREATE TABLE public.olt_branch_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id UUID REFERENCES public.olt_devices(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(olt_id, branch_id)
);
ALTER TABLE public.olt_branch_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage olt shares" ON public.olt_branch_shares FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view olt shares" ON public.olt_branch_shares FOR SELECT TO authenticated USING (true);
