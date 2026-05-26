
CREATE TABLE IF NOT EXISTS public.zkteco_device_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.zkteco_devices(id) ON DELETE CASCADE,
  device_user_id text NOT NULL,
  name text,
  card_no text,
  privilege integer DEFAULT 0,
  password text,
  group_no integer DEFAULT 1,
  fingerprint_count integer DEFAULT 0,
  mapped_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  last_seen_at timestamptz DEFAULT now(),
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS zkteco_device_users_uniq
  ON public.zkteco_device_users (device_id, device_user_id);

CREATE INDEX IF NOT EXISTS zkteco_device_users_employee_idx
  ON public.zkteco_device_users (mapped_employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zkteco_device_users TO authenticated;
GRANT ALL ON public.zkteco_device_users TO service_role;

ALTER TABLE public.zkteco_device_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view device users"
  ON public.zkteco_device_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage device users"
  ON public.zkteco_device_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_zkteco_device_users_updated
  BEFORE UPDATE ON public.zkteco_device_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
