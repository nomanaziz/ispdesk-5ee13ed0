
-- Alter mikrotik_devices
ALTER TABLE public.mikrotik_devices
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v3',
  ADD COLUMN IF NOT EXISTS timeout integer NOT NULL DEFAULT 10;

-- Create mikrotik_backups
CREATE TABLE public.mikrotik_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mikrotik_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE CASCADE NOT NULL,
  file_name text,
  file_url text,
  file_size bigint,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mikrotik_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view backups" ON public.mikrotik_backups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create backups" ON public.mikrotik_backups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete backups" ON public.mikrotik_backups FOR DELETE TO authenticated USING (true);

-- Create mikrotik_clients
CREATE TABLE public.mikrotik_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mikrotik_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE CASCADE,
  name text NOT NULL,
  password text,
  service text,
  profile text,
  caller_id text,
  server_name text,
  remote_address text,
  logout_time timestamptz,
  user_status text DEFAULT 'unique',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  exported boolean NOT NULL DEFAULT false,
  exported_to text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mikrotik_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view mikrotik_clients" ON public.mikrotik_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create mikrotik_clients" ON public.mikrotik_clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mikrotik_clients" ON public.mikrotik_clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mikrotik_clients" ON public.mikrotik_clients FOR DELETE TO authenticated USING (true);

-- Create mikrotik_bulk_imports
CREATE TABLE public.mikrotik_bulk_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  package_id uuid REFERENCES public.isp_packages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mikrotik_bulk_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view bulk_imports" ON public.mikrotik_bulk_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create bulk_imports" ON public.mikrotik_bulk_imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bulk_imports" ON public.mikrotik_bulk_imports FOR UPDATE TO authenticated USING (true);
