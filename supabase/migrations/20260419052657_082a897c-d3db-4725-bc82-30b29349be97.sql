-- Device permissions system
CREATE TABLE IF NOT EXISTS public.device_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all','branch','device')),
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, permission_key, scope, scope_id)
);
CREATE INDEX IF NOT EXISTS idx_device_perm_user ON public.device_permissions(user_id, permission_key);

ALTER TABLE public.device_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage device permissions"
ON public.device_permissions FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Users see own device permissions"
ON public.device_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Helper SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.has_device_permission(_user_id UUID, _key TEXT, _device_id UUID DEFAULT NULL, _branch_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_or_super(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.device_permissions dp
      WHERE dp.user_id = _user_id
        AND dp.permission_key = _key
        AND (
          dp.scope = 'all'
          OR (dp.scope = 'device' AND _device_id IS NOT NULL AND dp.scope_id = _device_id)
          OR (dp.scope = 'branch'  AND _branch_id IS NOT NULL AND dp.scope_id = _branch_id)
        )
    )
$$;

-- Extend switches
ALTER TABLE public.switches
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS firmware TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS snmp_community TEXT,
  ADD COLUMN IF NOT EXISTS snmp_version TEXT DEFAULT 'v2c',
  ADD COLUMN IF NOT EXISTS snmp_port INTEGER DEFAULT 161,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS uptime TEXT,
  ADD COLUMN IF NOT EXISTS cpu_usage NUMERIC,
  ADD COLUMN IF NOT EXISTS memory_usage NUMERIC,
  ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ;

ALTER TABLE public.switches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated read switches" ON public.switches FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage switches" ON public.switches FOR ALL TO authenticated
    USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Switch ports
CREATE TABLE IF NOT EXISTS public.switch_ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  if_index INTEGER,
  interface TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  oper_status TEXT,
  admin_status TEXT,
  speed_mbps INTEGER,
  duplex TEXT,
  flow_control TEXT,
  in_octets BIGINT,
  out_octets BIGINT,
  in_rate_bps BIGINT,
  out_rate_bps BIGINT,
  mac_address TEXT,
  vlan_id INTEGER,
  tx_power NUMERIC,
  rx_power NUMERIC,
  bias_current NUMERIC,
  sfp_temp NUMERIC,
  sfp_voltage NUMERIC,
  last_synced TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (switch_id, interface)
);
CREATE INDEX IF NOT EXISTS idx_switch_ports_switch ON public.switch_ports(switch_id);
ALTER TABLE public.switch_ports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read switch ports" ON public.switch_ports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Perm edit switch ports" ON public.switch_ports FOR UPDATE TO authenticated
  USING (public.has_device_permission(auth.uid(),'switch.port.edit', switch_id))
  WITH CHECK (public.has_device_permission(auth.uid(),'switch.port.edit', switch_id));
CREATE POLICY "Admins insert switch ports" ON public.switch_ports FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins delete switch ports" ON public.switch_ports FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Switch VLANs
CREATE TABLE IF NOT EXISTS public.switch_vlans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  vlan_id INTEGER NOT NULL,
  name TEXT,
  tagged_ports TEXT[] DEFAULT '{}',
  untagged_ports TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (switch_id, vlan_id)
);
ALTER TABLE public.switch_vlans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read vlans" ON public.switch_vlans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Perm manage vlans" ON public.switch_vlans FOR ALL TO authenticated
  USING (public.has_device_permission(auth.uid(),'switch.vlan.manage', switch_id))
  WITH CHECK (public.has_device_permission(auth.uid(),'switch.vlan.manage', switch_id));

-- Switch traffic samples (live)
CREATE TABLE IF NOT EXISTS public.switch_traffic_samples (
  id BIGSERIAL PRIMARY KEY,
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  interface TEXT NOT NULL,
  in_bps BIGINT,
  out_bps BIGINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_switch_traffic_lookup
  ON public.switch_traffic_samples(switch_id, interface, recorded_at DESC);
ALTER TABLE public.switch_traffic_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perm view traffic" ON public.switch_traffic_samples FOR SELECT TO authenticated
  USING (public.has_device_permission(auth.uid(),'switch.traffic.view', switch_id));
CREATE POLICY "Service inserts traffic" ON public.switch_traffic_samples FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Device audit log
CREATE TABLE IF NOT EXISTS public.device_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  device_kind TEXT NOT NULL,
  device_id UUID,
  target TEXT,
  payload JSONB,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_device ON public.device_audit_log(device_kind, device_id, created_at DESC);
ALTER TABLE public.device_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.device_audit_log FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins insert audit" ON public.device_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- updated_at trigger for switches
DROP TRIGGER IF EXISTS trg_switches_updated ON public.switches;
CREATE TRIGGER trg_switches_updated BEFORE UPDATE ON public.switches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();