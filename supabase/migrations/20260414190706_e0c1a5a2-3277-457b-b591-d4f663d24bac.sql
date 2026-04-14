
-- Create reseller_tariffs table
CREATE TABLE public.reseller_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  package_id uuid REFERENCES public.isp_packages(id) ON DELETE SET NULL,
  selling_rate numeric NOT NULL DEFAULT 0,
  activation_days integer NOT NULL DEFAULT 30,
  is_daily_recharge boolean NOT NULL DEFAULT false,
  protocol_type text DEFAULT 'PPPoE',
  mikrotik_server_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE SET NULL,
  mikrotik_profile text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reseller_tariffs" ON public.reseller_tariffs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enhance branch_managers for reseller functionality
ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS tariff_id uuid REFERENCES public.reseller_tariffs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_code text,
  ADD COLUMN IF NOT EXISTS client_code_prefix text,
  ADD COLUMN IF NOT EXISTS use_prefix boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nid_number text,
  ADD COLUMN IF NOT EXISTS min_recharge numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address text;

-- Create reseller PGW payments table
CREATE TABLE public.reseller_pgw_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid REFERENCES public.branch_managers(id) ON DELETE CASCADE NOT NULL,
  client_name text,
  client_contact text,
  total_amount numeric NOT NULL DEFAULT 0,
  our_share numeric NOT NULL DEFAULT 0,
  reseller_share numeric NOT NULL DEFAULT 0,
  tariff_rate numeric NOT NULL DEFAULT 0,
  payment_method text,
  transaction_id text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_pgw_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reseller_pgw_payments" ON public.reseller_pgw_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create reseller PGW settlements table
CREATE TABLE public.reseller_pgw_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid REFERENCES public.branch_managers(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT 'bank_transfer',
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  settled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_pgw_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reseller_pgw_settlements" ON public.reseller_pgw_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
