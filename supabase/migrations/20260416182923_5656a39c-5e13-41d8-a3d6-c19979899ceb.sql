
-- 1. Add columns to branch_managers
ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS pop_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS pop_prefix text,
  ADD COLUMN IF NOT EXISTS set_prefix_mikrotik boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pop_type text NOT NULL DEFAULT 'prepaid',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS district_id uuid,
  ADD COLUMN IF NOT EXISTS upazila_id uuid,
  ADD COLUMN IF NOT EXISTS zone_id uuid,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS disable_clients boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fund_started boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fund_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_create_permission boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pop_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS server_id uuid;

-- POP type validation
ALTER TABLE public.branch_managers
  DROP CONSTRAINT IF EXISTS branch_managers_pop_type_check;
ALTER TABLE public.branch_managers
  ADD CONSTRAINT branch_managers_pop_type_check CHECK (pop_type IN ('prepaid','postpaid'));

-- Sequence + auto pop_code
CREATE SEQUENCE IF NOT EXISTS public.pop_code_seq START 1;

CREATE OR REPLACE FUNCTION public.set_pop_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pop_code IS NULL OR NEW.pop_code = '' THEN
    NEW.pop_code := lpad(nextval('public.pop_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_pop_code ON public.branch_managers;
CREATE TRIGGER trg_set_pop_code
BEFORE INSERT ON public.branch_managers
FOR EACH ROW EXECUTE FUNCTION public.set_pop_code();

-- Backfill existing rows without pop_code
UPDATE public.branch_managers
SET pop_code = lpad(nextval('public.pop_code_seq')::text, 4, '0')
WHERE pop_code IS NULL;

-- 2. pop_transactions
CREATE TABLE IF NOT EXISTS public.pop_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('debit','credit','fund_deduction','fund_add')),
  amount numeric NOT NULL DEFAULT 0,
  balance_after numeric,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pop_transactions_pop_id ON public.pop_transactions(pop_id);

ALTER TABLE public.pop_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage pop_transactions" ON public.pop_transactions;
CREATE POLICY "admins manage pop_transactions"
ON public.pop_transactions FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 3. pop_fund_start_logs
CREATE TABLE IF NOT EXISTS public.pop_fund_start_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('start','stop')),
  effective_from timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pop_fund_start_logs_pop_id ON public.pop_fund_start_logs(pop_id);

ALTER TABLE public.pop_fund_start_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage pop_fund_start_logs" ON public.pop_fund_start_logs;
CREATE POLICY "admins manage pop_fund_start_logs"
ON public.pop_fund_start_logs FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- 4. pop-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pop-logos', 'pop-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pop-logos public read" ON storage.objects;
CREATE POLICY "pop-logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'pop-logos');

DROP POLICY IF EXISTS "pop-logos admin write" ON storage.objects;
CREATE POLICY "pop-logos admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pop-logos' AND public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "pop-logos admin update" ON storage.objects;
CREATE POLICY "pop-logos admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pop-logos' AND public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "pop-logos admin delete" ON storage.objects;
CREATE POLICY "pop-logos admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pop-logos' AND public.is_admin_or_super(auth.uid()));
