
-- Vendor OID profiles
CREATE TABLE public.device_vendor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  device_category text NOT NULL DEFAULT 'olt',
  is_system boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.device_oid_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.device_vendor_profiles(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  oid text NOT NULL,
  oid_type text NOT NULL DEFAULT 'scalar',
  value_transform text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, metric_key)
);

CREATE INDEX idx_oid_mappings_profile ON public.device_oid_mappings(profile_id);

ALTER TABLE public.device_vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_oid_mappings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "read profiles" ON public.device_vendor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "read mappings" ON public.device_oid_mappings FOR SELECT TO authenticated USING (true);

-- Only admins can write custom profiles; system profiles cannot be modified
CREATE POLICY "admin insert custom profile" ON public.device_vendor_profiles FOR INSERT TO authenticated
  WITH CHECK (is_system = false AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update custom profile" ON public.device_vendor_profiles FOR UPDATE TO authenticated
  USING (is_system = false AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (is_system = false);
CREATE POLICY "admin delete custom profile" ON public.device_vendor_profiles FOR DELETE TO authenticated
  USING (is_system = false AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert mapping" ON public.device_oid_mappings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.device_vendor_profiles p WHERE p.id = profile_id AND p.is_system = false));
CREATE POLICY "admin update mapping" ON public.device_oid_mappings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.device_vendor_profiles p WHERE p.id = profile_id AND p.is_system = false));
CREATE POLICY "admin delete mapping" ON public.device_oid_mappings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.device_vendor_profiles p WHERE p.id = profile_id AND p.is_system = false));

CREATE TRIGGER trg_vendor_profiles_updated BEFORE UPDATE ON public.device_vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend device_admin_managed_devices
ALTER TABLE public.device_admin_managed_devices
  ADD COLUMN IF NOT EXISTS snmp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snmp_ip text,
  ADD COLUMN IF NOT EXISTS snmp_port integer NOT NULL DEFAULT 161,
  ADD COLUMN IF NOT EXISTS snmp_community text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS snmp_version text NOT NULL DEFAULT 'v2c',
  ADD COLUMN IF NOT EXISTS oid_profile_id uuid REFERENCES public.device_vendor_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source_priority text NOT NULL DEFAULT 'snmp_first',
  ADD COLUMN IF NOT EXISTS agent_stale_seconds integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS fallback_protocol text;

-- Seed system profiles
WITH seeded AS (
  INSERT INTO public.device_vendor_profiles (vendor_key, display_name, device_category, is_system, notes) VALUES
    ('vsol_olt', 'VSOL OLT', 'olt', true, 'EPON/GPON + VSOL private MIB'),
    ('bdcom_olt', 'BDCOM OLT', 'olt', true, 'BDCOM enterprise OID .1.3.6.1.4.1.3320'),
    ('dbc_olt', 'DBC OLT', 'olt', true, 'C-Data based'),
    ('syrotech_olt', 'Syrotech OLT', 'olt', true, 'EPON standard + Syrotech ext'),
    ('solitine_olt', 'Solitine OLT', 'olt', true, 'Generic GPON'),
    ('corelink_olt', 'CORELINK OLT', 'olt', true, 'C-Data clone'),
    ('cdata_olt', 'C-Data OLT', 'olt', true, '.1.3.6.1.4.1.17409'),
    ('ecom_olt', 'ECOM OLT', 'olt', true, 'Generic'),
    ('lightx_olt', 'LightX OLT', 'olt', true, 'Generic GPON'),
    ('hsgq_olt', 'HSGQ OLT', 'olt', true, 'Generic EPON'),
    ('phyhome_olt', 'Phyhome OLT', 'olt', true, 'Phyhome private MIB'),
    ('tbs_olt', 'TBS OLT', 'olt', true, 'Generic'),
    ('huawei_olt', 'Huawei OLT (MA5600 series)', 'olt', true, '.1.3.6.1.4.1.2011'),
    ('hbdpon_olt', 'HBDPON OLT', 'olt', true, 'Generic'),
    ('mikrotik_router', 'MikroTik Router/Switch', 'router', true, 'MikroTik MIB .1.3.6.1.4.1.14988')
  RETURNING id, vendor_key
)
INSERT INTO public.device_oid_mappings (profile_id, metric_key, oid, oid_type, value_transform, description)
SELECT s.id, m.metric_key, m.oid, m.oid_type, m.value_transform, m.description
FROM seeded s
JOIN LATERAL (
  VALUES
    ('system_name',   '1.3.6.1.2.1.1.5.0',  'scalar', NULL, 'sysName'),
    ('system_descr',  '1.3.6.1.2.1.1.1.0',  'scalar', NULL, 'sysDescr'),
    ('system_uptime', '1.3.6.1.2.1.1.3.0',  'scalar', 'timeticks', 'sysUpTime')
) AS m(metric_key, oid, oid_type, value_transform, description) ON true;

-- MikroTik specific CPU/memory
INSERT INTO public.device_oid_mappings (profile_id, metric_key, oid, oid_type, value_transform, description)
SELECT id, 'cpu_usage', '1.3.6.1.2.1.25.3.3.1.2.1', 'scalar', NULL, 'hrProcessorLoad'
FROM public.device_vendor_profiles WHERE vendor_key = 'mikrotik_router'
ON CONFLICT DO NOTHING;

-- OLT generic ONU OID placeholders (admin will fine-tune)
INSERT INTO public.device_oid_mappings (profile_id, metric_key, oid, oid_type, value_transform, description)
SELECT p.id, m.metric_key, m.oid, m.oid_type, m.value_transform, m.description
FROM public.device_vendor_profiles p
JOIN LATERAL (VALUES
  ('onu_rx_power',  '1.3.6.1.4.1.0.0.0.0', 'walk', 'dbm_signed_div10', 'PLACEHOLDER — vendor-specific'),
  ('onu_status',    '1.3.6.1.4.1.0.0.0.0', 'walk', NULL, 'PLACEHOLDER — vendor-specific'),
  ('onu_serial',    '1.3.6.1.4.1.0.0.0.0', 'walk', 'hex_string', 'PLACEHOLDER — vendor-specific'),
  ('onu_distance',  '1.3.6.1.4.1.0.0.0.0', 'walk', NULL, 'PLACEHOLDER — vendor-specific')
) AS m(metric_key, oid, oid_type, value_transform, description) ON true
WHERE p.is_system = true AND p.device_category = 'olt'
ON CONFLICT DO NOTHING;

-- Huawei real OIDs
UPDATE public.device_oid_mappings SET oid = '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4', value_transform = 'dbm_signed_div100', description = 'hwGponOntOpticalDdmInfoRxPower'
WHERE metric_key = 'onu_rx_power' AND profile_id = (SELECT id FROM public.device_vendor_profiles WHERE vendor_key = 'huawei_olt');
UPDATE public.device_oid_mappings SET oid = '1.3.6.1.4.1.2011.6.128.1.1.2.46.1.15', description = 'hwGponDeviceOntControlRunStatus'
WHERE metric_key = 'onu_status' AND profile_id = (SELECT id FROM public.device_vendor_profiles WHERE vendor_key = 'huawei_olt');

-- BDCOM real OIDs (sample)
UPDATE public.device_oid_mappings SET oid = '1.3.6.1.4.1.3320.101.10.1.1.27', value_transform = 'dbm_signed_div10', description = 'bdcomOnuRxPower'
WHERE metric_key = 'onu_rx_power' AND profile_id = (SELECT id FROM public.device_vendor_profiles WHERE vendor_key = 'bdcom_olt');

-- VSOL real OIDs (sample)
UPDATE public.device_oid_mappings SET oid = '1.3.6.1.4.1.37950.1.1.5.10.1.5.1.7', value_transform = 'dbm_signed_div10', description = 'vsolOnuRxPower'
WHERE metric_key = 'onu_rx_power' AND profile_id = (SELECT id FROM public.device_vendor_profiles WHERE vendor_key = 'vsol_olt');
