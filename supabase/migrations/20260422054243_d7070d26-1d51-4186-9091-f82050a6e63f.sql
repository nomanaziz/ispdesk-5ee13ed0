-- Create automatic_processes table
CREATE TABLE public.automatic_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  process_key text NOT NULL,
  process_name text NOT NULL,
  execute_at time NOT NULL DEFAULT '00:00',
  interval_type text NOT NULL DEFAULT 'daily',
  execution_day text NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_run timestamptz NULL,
  next_run timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automatic_processes_branch ON public.automatic_processes(branch_id);
CREATE UNIQUE INDEX idx_automatic_processes_key_branch
  ON public.automatic_processes(process_key, COALESCE(branch_id::text,'global'));

ALTER TABLE public.automatic_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automatic processes"
  ON public.automatic_processes FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view automatic processes"
  ON public.automatic_processes FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_automatic_processes_updated_at
  BEFORE UPDATE ON public.automatic_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default global rows
INSERT INTO public.automatic_processes(process_key, process_name, execute_at, interval_type, execution_day, enabled)
VALUES
  ('package_scheduler',     'Package Scheduler',          '00:05', 'daily',   NULL,        true),
  ('status_scheduler',      'Status Scheduler',           '00:10', 'hourly',  NULL,        true),
  ('validate_payments',     'Validate Payments',          '01:00', 'daily',   NULL,        true),
  ('disable_unpaid',        'Disable Unpaid Clients',     '02:00', 'daily',   NULL,        true),
  ('sms_before_expiry',     'Send SMS Before Expiry',     '09:00', 'daily',   NULL,        true),
  ('prepaid_auto_renewal',  'Prepaid Auto Renewal',       '00:30', 'daily',   NULL,        true);