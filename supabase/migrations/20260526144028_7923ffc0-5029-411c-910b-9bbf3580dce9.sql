INSERT INTO public.olt_devices (
  name, vendor, pon_type, ip_address, snmp_ip, snmp_port, snmp_community, snmp_version,
  snmp_enabled, telnet_port, username, password_encrypted, brand_model,
  data_source_priority, agent_enabled, snmp_fallback_enabled, agent_stale_seconds,
  assigned_agent_id, status, connection_type
) VALUES (
  'AFTABNAGAR-OLT', 'bdcom', 'gpon', '192.168.110.4', '192.168.110.4', 161, 'GxNsnMP_RO', 'v2c',
  true, 23, 'admin', 'greendhaka', 'BDCOM GPON OLT',
  'agent_first', true, true, 180,
  (SELECT id FROM public.polling_agents WHERE name='Naeem-PC' LIMIT 1),
  'unknown', 'telnet'
);