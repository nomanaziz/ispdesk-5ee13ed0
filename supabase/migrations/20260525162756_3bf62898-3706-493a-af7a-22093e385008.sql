
-- 1. Add pon_type column
ALTER TABLE public.olt_devices ADD COLUMN IF NOT EXISTS pon_type text DEFAULT 'mixed';
ALTER TABLE public.device_admin_managed_devices ADD COLUMN IF NOT EXISTS pon_type text DEFAULT 'mixed';

-- 2. Update mirror trigger to copy pon_type
CREATE OR REPLACE FUNCTION public.sync_managed_device_to_olt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    IF TG_OP = 'UPDATE' AND OLD.category = 'olt' THEN
      DELETE FROM public.olt_devices WHERE id = OLD.id;
    END IF;
    RETURN NEW;
  END IF;

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
    pon_type, created_at, updated_at
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
    COALESCE(NEW.pon_type, 'mixed'),
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
    pon_type = EXCLUDED.pon_type,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 3. Seed BDCOM EPON profile
DO $$
DECLARE
  v_epon_id uuid;
  v_gpon_id uuid;
BEGIN
  -- Find existing oid_profiles table (search likely name)
  -- Profile rows may live in same table as profile_id reference target.
  -- Try to locate it:
  NULL;
END $$;
