
-- 1. Extend onu_list with NexOLT detail fields (distance & offline_reason already exist)
ALTER TABLE public.onu_list
  ADD COLUMN IF NOT EXISTS distance_m integer,
  ADD COLUMN IF NOT EXISTS last_offline_at timestamptz,
  ADD COLUMN IF NOT EXISTS alive_seconds integer,
  ADD COLUMN IF NOT EXISTS temperature numeric,
  ADD COLUMN IF NOT EXISTS vendor_id text,
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS onu_type text,
  ADD COLUMN IF NOT EXISTS ethernet_count integer,
  ADD COLUMN IF NOT EXISTS wifi_count integer,
  ADD COLUMN IF NOT EXISTS response_time_ms integer,
  ADD COLUMN IF NOT EXISTS last_register_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_onu_list_olt_status_interface
  ON public.onu_list (olt_id, status, interface);

-- 2. olt_reseller_access mapping table
CREATE TABLE IF NOT EXISTS public.olt_reseller_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  olt_id uuid NOT NULL REFERENCES public.olt_devices(id) ON DELETE CASCADE,
  reseller_branch_manager_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (olt_id, reseller_branch_manager_id)
);

CREATE INDEX IF NOT EXISTS idx_olt_reseller_access_reseller
  ON public.olt_reseller_access (reseller_branch_manager_id);
CREATE INDEX IF NOT EXISTS idx_olt_reseller_access_olt
  ON public.olt_reseller_access (olt_id);

ALTER TABLE public.olt_reseller_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage olt reseller access"
  ON public.olt_reseller_access
  FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Reseller views own access rows"
  ON public.olt_reseller_access
  FOR SELECT
  USING (
    reseller_branch_manager_id IN (
      SELECT bm.id FROM public.branch_managers bm
      WHERE bm.user_id = auth.uid()
    )
  );

-- 3. Allow resellers to SELECT assigned OLTs
CREATE POLICY "Resellers see assigned OLTs"
  ON public.olt_devices
  FOR SELECT
  USING (
    id IN (
      SELECT ora.olt_id
      FROM public.olt_reseller_access ora
      JOIN public.branch_managers bm ON bm.id = ora.reseller_branch_manager_id
      WHERE bm.user_id = auth.uid()
    )
  );
