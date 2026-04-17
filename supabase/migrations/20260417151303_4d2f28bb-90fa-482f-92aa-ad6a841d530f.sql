
-- Device groups
CREATE TABLE public.device_admin_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.device_admin_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.device_admin_groups(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('mikrotik','olt','switch','zkteco')),
  device_id UUID NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, device_type, device_id)
);

-- Bulk job tracking (deploy/delete user, backup)
CREATE TABLE public.device_admin_deploy_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('deploy_user','delete_user','backup','restore')),
  username TEXT,
  password_hash TEXT,
  permission TEXT CHECK (permission IN ('read','write','full')),
  target_devices JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','partial','failed')),
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Audit log
CREATE TABLE public.device_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  device_type TEXT,
  device_id UUID,
  device_name TEXT,
  target_username TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_admin_audit_created ON public.device_admin_audit_log(created_at DESC);
CREATE INDEX idx_device_admin_audit_device ON public.device_admin_audit_log(device_type, device_id);

-- Schedules
CREATE TABLE public.device_admin_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'backup' CHECK (schedule_type IN ('backup')),
  group_id UUID REFERENCES public.device_admin_groups(id) ON DELETE SET NULL,
  device_type TEXT,
  device_id UUID,
  cron_expression TEXT NOT NULL,
  frequency TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Centralized backup files registry (cross-device)
CREATE TABLE public.device_admin_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL,
  device_id UUID NOT NULL,
  device_name TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual','scheduled','admin','api')),
  schedule_id UUID REFERENCES public.device_admin_schedules(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.device_admin_deploy_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_admin_backups_device ON public.device_admin_backups(device_type, device_id);
CREATE INDEX idx_device_admin_backups_created ON public.device_admin_backups(created_at DESC);

-- Enable RLS
ALTER TABLE public.device_admin_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_admin_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_admin_deploy_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_admin_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_admin_backups ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin all groups" ON public.device_admin_groups
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin all group_members" ON public.device_admin_group_members
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin all deploy_jobs" ON public.device_admin_deploy_jobs
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin read audit" ON public.device_admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin insert audit" ON public.device_admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin all schedules" ON public.device_admin_schedules
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin all backups" ON public.device_admin_backups
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER trg_device_admin_groups_updated
  BEFORE UPDATE ON public.device_admin_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_device_admin_schedules_updated
  BEFORE UPDATE ON public.device_admin_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-backups', 'device-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin read device-backups" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin upload device-backups" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin update device-backups" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "admin delete device-backups" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'device-backups' AND public.is_admin_or_super(auth.uid()));
