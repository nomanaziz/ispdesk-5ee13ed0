
-- Add username/password columns to mikrotik_devices
ALTER TABLE public.mikrotik_devices
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password_encrypted text;

-- Add mikrotik_id, username, password, description to olt_devices
ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS mikrotik_id uuid REFERENCES public.mikrotik_devices(id),
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password_encrypted text,
  ADD COLUMN IF NOT EXISTS description text;

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text,
  whatsapp_id text,
  branch_id uuid REFERENCES public.branches(id),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings FOR ALL
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view notification settings"
  ON public.notification_settings FOR SELECT
  TO authenticated
  USING (true);
