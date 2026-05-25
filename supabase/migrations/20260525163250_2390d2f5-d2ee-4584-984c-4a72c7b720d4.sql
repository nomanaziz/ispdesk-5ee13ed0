
INSERT INTO public.device_vendor_profiles (id, vendor_key, display_name, device_category, is_system)
VALUES ('b1dc00ee-0000-4000-8000-000000000001', 'bdcom_olt_epon', 'BDCOM OLT (EPON)', 'olt', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.device_vendor_profiles (id, vendor_key, display_name, device_category, is_system)
VALUES ('b1dc00ee-0000-4000-8000-000000000002', 'bdcom_olt_gpon', 'BDCOM OLT (GPON)', 'olt', true)
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.device_oid_mappings WHERE profile_id IN (
  'b1dc00ee-0000-4000-8000-000000000001',
  'b1dc00ee-0000-4000-8000-000000000002'
);

INSERT INTO public.device_oid_mappings (profile_id, metric_key, oid, oid_type, description, value_transform) VALUES
  ('b1dc00ee-0000-4000-8000-000000000001', 'system_name',   '1.3.6.1.2.1.1.5.0',              'scalar', 'sysName',        NULL),
  ('b1dc00ee-0000-4000-8000-000000000001', 'system_descr',  '1.3.6.1.2.1.1.1.0',              'scalar', 'sysDescr',       NULL),
  ('b1dc00ee-0000-4000-8000-000000000001', 'system_uptime', '1.3.6.1.2.1.1.3.0',              'scalar', 'sysUpTime',      'timeticks'),
  ('b1dc00ee-0000-4000-8000-000000000001', 'onu_mac',       '1.3.6.1.4.1.3320.101.10.1.1.3',  'walk',   'bdcomOnuMac',    'hex_mac'),
  ('b1dc00ee-0000-4000-8000-000000000001', 'onu_status',    '1.3.6.1.4.1.3320.101.10.1.1.26', 'walk',   'bdcomOnuStatus', NULL),
  ('b1dc00ee-0000-4000-8000-000000000001', 'onu_rx_power',  '1.3.6.1.4.1.3320.101.10.1.1.27', 'walk',   'bdcomOnuRxPower','dbm_signed_div10'),
  ('b1dc00ee-0000-4000-8000-000000000001', 'onu_distance',  '1.3.6.1.4.1.3320.101.108.1.1.11','walk',   'bdcomOnuDistance', NULL);

INSERT INTO public.device_oid_mappings (profile_id, metric_key, oid, oid_type, description, value_transform) VALUES
  ('b1dc00ee-0000-4000-8000-000000000002', 'system_name',   '1.3.6.1.2.1.1.5.0',              'scalar', 'sysName',        NULL),
  ('b1dc00ee-0000-4000-8000-000000000002', 'system_descr',  '1.3.6.1.2.1.1.1.0',              'scalar', 'sysDescr',       NULL),
  ('b1dc00ee-0000-4000-8000-000000000002', 'system_uptime', '1.3.6.1.2.1.1.3.0',              'scalar', 'sysUpTime',      'timeticks'),
  ('b1dc00ee-0000-4000-8000-000000000002', 'onu_serial',    '1.3.6.1.4.1.3320.10.3.1.1.4',    'walk',   'bdcomGponOnuSn',     'hex_string'),
  ('b1dc00ee-0000-4000-8000-000000000002', 'onu_status',    '1.3.6.1.4.1.3320.10.3.1.1.5',    'walk',   'bdcomGponOnuStatus', NULL),
  ('b1dc00ee-0000-4000-8000-000000000002', 'onu_rx_power',  '1.3.6.1.4.1.3320.10.3.5.1.1.5',  'walk',   'bdcomGponOnuRxPower','dbm_signed_div10'),
  ('b1dc00ee-0000-4000-8000-000000000002', 'onu_distance',  '1.3.6.1.4.1.3320.10.3.5.1.1.7',  'walk',   'bdcomGponOnuDistance', NULL);

UPDATE public.device_admin_managed_devices
   SET pon_type = 'gpon',
       oid_profile_id = 'b1dc00ee-0000-4000-8000-000000000002'
 WHERE id = 'c6a38ddd-64d2-4a98-88bf-9649d83d014b';

UPDATE public.olt_devices
   SET pon_type = 'gpon'
 WHERE id = 'c6a38ddd-64d2-4a98-88bf-9649d83d014b';
