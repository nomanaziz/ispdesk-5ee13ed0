
-- Step 1: Global UID system (schema + triggers only; backfill in next migration)
CREATE TABLE IF NOT EXISTS public.global_uid_seq (
  tenant_id uuid NOT NULL,
  uid_type text NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, uid_type)
);

GRANT SELECT ON public.global_uid_seq TO authenticated;
GRANT ALL ON public.global_uid_seq TO service_role;

ALTER TABLE public.global_uid_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_super_read_uid_seq" ON public.global_uid_seq
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_global_uid(_type text, _tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq integer;
  v_tid uuid := COALESCE(_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  INSERT INTO public.global_uid_seq(tenant_id, uid_type, last_seq)
  VALUES (v_tid, _type, 1)
  ON CONFLICT (tenant_id, uid_type)
  DO UPDATE SET last_seq = public.global_uid_seq.last_seq + 1, updated_at = now()
  RETURNING last_seq INTO v_seq;
  RETURN _type || '-' || upper(substr(replace(v_tid::text, '-', ''), 1, 4)) || '-' || lpad(v_seq::text, 6, '0');
END $$;

ALTER TABLE public.clients            ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE public.bw_sale_customers  ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE public.employees          ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE public.branch_managers    ADD COLUMN IF NOT EXISTS uid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_uid           ON public.clients(uid)           WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bw_sale_customers_uid ON public.bw_sale_customers(uid) WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid         ON public.employees(uid)         WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_managers_uid   ON public.branch_managers(uid)   WHERE uid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_set_client_uid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid uuid;
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    SELECT tenant_id INTO v_tid FROM public.branches WHERE id = NEW.branch_id;
    NEW.uid := public.generate_global_uid('CLI', v_tid);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_set_bwc_uid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    NEW.uid := public.generate_global_uid('BWC', NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_set_employee_uid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid uuid;
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    SELECT tenant_id INTO v_tid FROM public.branches WHERE id = NEW.branch_id;
    NEW.uid := public.generate_global_uid('EMP', v_tid);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_set_pop_uid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid uuid;
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    SELECT tenant_id INTO v_tid FROM public.branches WHERE id = NEW.branch_id;
    NEW.uid := public.generate_global_uid('RSL', v_tid);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_client_uid ON public.clients;
CREATE TRIGGER set_client_uid BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_client_uid();

DROP TRIGGER IF EXISTS set_bwc_uid ON public.bw_sale_customers;
CREATE TRIGGER set_bwc_uid BEFORE INSERT ON public.bw_sale_customers
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_bwc_uid();

DROP TRIGGER IF EXISTS set_employee_uid ON public.employees;
CREATE TRIGGER set_employee_uid BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_employee_uid();

DROP TRIGGER IF EXISTS set_pop_uid ON public.branch_managers;
CREATE TRIGGER set_pop_uid BEFORE INSERT ON public.branch_managers
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_pop_uid();
