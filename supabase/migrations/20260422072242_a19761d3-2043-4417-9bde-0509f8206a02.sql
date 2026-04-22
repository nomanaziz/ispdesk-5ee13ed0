
CREATE TABLE IF NOT EXISTS public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designations_branch ON public.designations(branch_id);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all designations" ON public.designations;
CREATE POLICY "Admins manage all designations"
  ON public.designations FOR ALL
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Branch users view own designations" ON public.designations;
CREATE POLICY "Branch users view own designations"
  ON public.designations FOR SELECT
  TO authenticated
  USING (branch_id = public.get_user_branch(auth.uid()));

DROP POLICY IF EXISTS "Branch users insert own designations" ON public.designations;
CREATE POLICY "Branch users insert own designations"
  ON public.designations FOR INSERT
  TO authenticated
  WITH CHECK (branch_id = public.get_user_branch(auth.uid()));

DROP POLICY IF EXISTS "Branch users update own designations" ON public.designations;
CREATE POLICY "Branch users update own designations"
  ON public.designations FOR UPDATE
  TO authenticated
  USING (branch_id = public.get_user_branch(auth.uid()));

DROP POLICY IF EXISTS "Branch users delete own designations" ON public.designations;
CREATE POLICY "Branch users delete own designations"
  ON public.designations FOR DELETE
  TO authenticated
  USING (branch_id = public.get_user_branch(auth.uid()));

DROP POLICY IF EXISTS "Anon read designations" ON public.designations;
CREATE POLICY "Anon read designations"
  ON public.designations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anon manage designations" ON public.designations;
CREATE POLICY "Anon manage designations"
  ON public.designations FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.seed_pop_defaults(_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _branch_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.departments (name, branch_id, status)
  SELECT 'Admin', _branch_id, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE branch_id = _branch_id AND lower(name) = 'admin');

  INSERT INTO public.departments (name, branch_id, status)
  SELECT 'Technician', _branch_id, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE branch_id = _branch_id AND lower(name) = 'technician');

  INSERT INTO public.designations (name, branch_id, status)
  SELECT 'Manager', _branch_id, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.designations WHERE branch_id = _branch_id AND lower(name) = 'manager');

  INSERT INTO public.designations (name, branch_id, status)
  SELECT 'Technician', _branch_id, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.designations WHERE branch_id = _branch_id AND lower(name) = 'technician');

  INSERT INTO public.zones (name, code, branch_id, status, description)
  SELECT 'Default Zone', 'DEFAULT', _branch_id, 'active', 'Auto-created default zone'
  WHERE NOT EXISTS (SELECT 1 FROM public.zones WHERE branch_id = _branch_id AND lower(name) = 'default zone');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_pop_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_pop_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS branches_seed_defaults ON public.branches;
CREATE TRIGGER branches_seed_defaults
  AFTER INSERT ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_pop_defaults();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.branches LOOP
    PERFORM public.seed_pop_defaults(r.id);
  END LOOP;
END $$;
