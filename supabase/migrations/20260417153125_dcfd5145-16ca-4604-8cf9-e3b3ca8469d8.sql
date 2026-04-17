-- 1. User inventory cache table
CREATE TABLE IF NOT EXISTS public.device_admin_user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  device_type text NOT NULL,
  device_id uuid NOT NULL,
  device_name text,
  permission text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_type, device_id, username)
);

CREATE INDEX IF NOT EXISTS idx_dau_inventory_username ON public.device_admin_user_inventory (lower(username));
CREATE INDEX IF NOT EXISTS idx_dau_inventory_device ON public.device_admin_user_inventory (device_type, device_id);

ALTER TABLE public.device_admin_user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user inventory"
ON public.device_admin_user_inventory
FOR ALL
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 2. Add payload to schedules for user add/remove
ALTER TABLE public.device_admin_schedules
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'backup',
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;