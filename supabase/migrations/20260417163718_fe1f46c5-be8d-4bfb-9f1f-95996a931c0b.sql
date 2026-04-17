-- 1. device_admin_managed_devices: unified table for non-MikroTik devices and any extra managed devices
CREATE TABLE IF NOT EXISTS public.device_admin_managed_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other', -- mikrotik|olt|switch|zkteco|other
  vendor text NOT NULL DEFAULT 'generic', -- juniper|huawei|bdcom|cdata|cisco|mikrotik|generic
  protocol text NOT NULL DEFAULT 'ssh', -- ssh|telnet|api
  ip_address text,
  port integer,
  username text,
  password_encrypted text,
  enable_password text,
  location text,
  group_id uuid,
  backup_schedule text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'unknown',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_admin_managed_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view managed devices"
ON public.device_admin_managed_devices FOR SELECT
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can insert managed devices"
ON public.device_admin_managed_devices FOR INSERT
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update managed devices"
ON public.device_admin_managed_devices FOR UPDATE
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete managed devices"
ON public.device_admin_managed_devices FOR DELETE
USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_device_admin_managed_devices_updated
BEFORE UPDATE ON public.device_admin_managed_devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add backup_format + file_size columns to device_admin_backups (if exists)
ALTER TABLE public.device_admin_backups
  ADD COLUMN IF NOT EXISTS backup_format text NOT NULL DEFAULT 'backup',
  ADD COLUMN IF NOT EXISTS file_size bigint;

-- 3. Storage policies for device-backups bucket (admin only)
DO $$ BEGIN
  CREATE POLICY "Admins can view device backup files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can upload device backup files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete device backup files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;