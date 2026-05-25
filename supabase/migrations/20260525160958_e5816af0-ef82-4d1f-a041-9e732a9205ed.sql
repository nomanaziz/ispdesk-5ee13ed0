
-- Mirror category='olt' rows from device_admin_managed_devices into olt_devices
CREATE OR REPLACE FUNCTION public.sync_managed_device_to_olt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor olt_vendor;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.category = 'olt' THEN
      DELETE FROM public.olt_devices WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.category <> 'olt' THEN
    -- If updated away from olt, remove mirror
    IF TG_OP = 'UPDATE' AND OLD.category = 'olt' THEN
      DELETE FROM public.olt_devices WHERE id = OLD.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Safe vendor cast (fallback to huawei if unknown)
  BEGIN
    v_vendor := lower(coalesce(NEW.vendor, 'huawei'))::olt_vendor;
  EXCEPTION WHEN OTHERS THEN
    v_vendor := 'huawei'::olt_vendor;
  END;

  INSERT INTO public.olt_devices (
    id, name, ip_address, vendor, port, connection_type,
    username, password_encrypted, description,
    snmp_enabled, snmp_ip, snmp_port, snmp_community, snmp_version,
    data_source_priority, agent_enabled, snmp_fallback_enabled, agent_stale_seconds,
    created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.name, NEW.ip_address, v_vendor,
    COALESCE(NEW.port, 23),
    CASE WHEN NEW.protocol IN ('ssh','telnet') THEN NEW.protocol::connection_type ELSE 'telnet'::connection_type END,
    NEW.username, NEW.password_encrypted,
    NULL,
    COALESCE(NEW.snmp_enabled, false), NEW.snmp_ip,
    COALESCE(NEW.snmp_port, 161), COALESCE(NEW.snmp_community, 'public'),
    COALESCE(NEW.snmp_version, 'v2c'),
    COALESCE(NEW.data_source_priority, 'agent_first'),
    COALESCE(NEW.agent_enabled, true),
    true,
    COALESCE(NEW.agent_stale_seconds, 180),
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    ip_address = EXCLUDED.ip_address,
    vendor = EXCLUDED.vendor,
    port = EXCLUDED.port,
    connection_type = EXCLUDED.connection_type,
    username = EXCLUDED.username,
    password_encrypted = EXCLUDED.password_encrypted,
    snmp_enabled = EXCLUDED.snmp_enabled,
    snmp_ip = EXCLUDED.snmp_ip,
    snmp_port = EXCLUDED.snmp_port,
    snmp_community = EXCLUDED.snmp_community,
    snmp_version = EXCLUDED.snmp_version,
    data_source_priority = EXCLUDED.data_source_priority,
    agent_enabled = EXCLUDED.agent_enabled,
    agent_stale_seconds = EXCLUDED.agent_stale_seconds,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_managed_to_olt ON public.device_admin_managed_devices;
CREATE TRIGGER trg_sync_managed_to_olt
AFTER INSERT OR UPDATE OR DELETE ON public.device_admin_managed_devices
FOR EACH ROW EXECUTE FUNCTION public.sync_managed_device_to_olt();

-- Backfill existing category='olt' rows
INSERT INTO public.olt_devices (
  id, name, ip_address, vendor, port, connection_type,
  username, password_encrypted,
  snmp_enabled, snmp_ip, snmp_port, snmp_community, snmp_version,
  data_source_priority, agent_enabled, snmp_fallback_enabled, agent_stale_seconds,
  created_at, updated_at
)
SELECT
  d.id, d.name, d.ip_address,
  CASE WHEN lower(d.vendor) IN ('huawei','bdcom','vsol','dbc','syrotech','solitine','corelink','c-data','ecom','hsgq','phyhome')
       THEN lower(d.vendor)::olt_vendor ELSE 'huawei'::olt_vendor END,
  COALESCE(d.port, 23),
  CASE WHEN d.protocol IN ('ssh','telnet') THEN d.protocol::connection_type ELSE 'telnet'::connection_type END,
  d.username, d.password_encrypted,
  COALESCE(d.snmp_enabled, false), d.snmp_ip,
  COALESCE(d.snmp_port, 161), COALESCE(d.snmp_community, 'public'),
  COALESCE(d.snmp_version, 'v2c'),
  COALESCE(d.data_source_priority, 'agent_first'),
  COALESCE(d.agent_enabled, true), true,
  COALESCE(d.agent_stale_seconds, 180),
  d.created_at, d.updated_at
FROM public.device_admin_managed_devices d
WHERE d.category = 'olt'
ON CONFLICT (id) DO NOTHING;
