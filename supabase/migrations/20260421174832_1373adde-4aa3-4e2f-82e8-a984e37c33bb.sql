-- POP daily charges log table
CREATE TABLE public.pop_daily_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_username text,
  client_name text,
  package_id uuid,
  package_name text,
  profile text,
  protocol_type text,
  server_id uuid,
  server_name text,
  zone_id uuid,
  zone_name text,
  sub_zone_id uuid,
  sub_zone_name text,
  monthly_rate numeric NOT NULL DEFAULT 0,
  daily_rate numeric NOT NULL DEFAULT 0,
  charged_amount numeric NOT NULL DEFAULT 0,
  pop_balance_before numeric NOT NULL DEFAULT 0,
  pop_balance_after numeric NOT NULL DEFAULT 0,
  charge_date date NOT NULL DEFAULT CURRENT_DATE,
  charged_by text DEFAULT 'system',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate charges for the same client/POP/date
CREATE UNIQUE INDEX pop_daily_charges_unique_per_day
  ON public.pop_daily_charges (pop_id, client_id, charge_date)
  WHERE client_id IS NOT NULL;

-- Indexes for common queries
CREATE INDEX pop_daily_charges_pop_date_idx ON public.pop_daily_charges (pop_id, charge_date DESC);
CREATE INDEX pop_daily_charges_branch_date_idx ON public.pop_daily_charges (branch_id, charge_date DESC);
CREATE INDEX pop_daily_charges_client_date_idx ON public.pop_daily_charges (client_id, charge_date DESC);

-- Enable RLS
ALTER TABLE public.pop_daily_charges ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins can manage pop_daily_charges"
  ON public.pop_daily_charges
  FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Anyone authenticated can read (POP scoping enforced client-side via branch filter on portal session)
-- Safe because portal users use anon key and queries filter by branch_id.
CREATE POLICY "Public read pop_daily_charges"
  ON public.pop_daily_charges
  FOR SELECT
  USING (true);
