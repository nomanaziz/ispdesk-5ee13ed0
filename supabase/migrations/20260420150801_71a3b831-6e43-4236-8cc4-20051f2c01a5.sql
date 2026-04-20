-- ============================================
-- A1. Auto-create branch on POP + backfill
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_branch_for_pop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  IF NEW.branch_id IS NULL THEN
    INSERT INTO public.branches (name, location)
    VALUES (NEW.name, COALESCE(NEW.address, NEW.company_name, NEW.name))
    RETURNING id INTO v_branch_id;
    NEW.branch_id := v_branch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_branch_for_pop ON public.branch_managers;
CREATE TRIGGER trg_ensure_branch_for_pop
BEFORE INSERT ON public.branch_managers
FOR EACH ROW
EXECUTE FUNCTION public.ensure_branch_for_pop();

-- Backfill existing POPs without branch
DO $$
DECLARE
  r record;
  v_branch_id uuid;
BEGIN
  FOR r IN SELECT id, name, address, company_name FROM public.branch_managers WHERE branch_id IS NULL LOOP
    INSERT INTO public.branches (name, location)
    VALUES (r.name, COALESCE(r.address, r.company_name, r.name))
    RETURNING id INTO v_branch_id;
    UPDATE public.branch_managers SET branch_id = v_branch_id WHERE id = r.id;
  END LOOP;
END$$;

-- ============================================
-- A2. Add branch_id to scoped config tables
-- ============================================
ALTER TABLE public.boxes        ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.sub_zones    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.positions    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boxes_branch       ON public.boxes(branch_id);
CREATE INDEX IF NOT EXISTS idx_sub_zones_branch   ON public.sub_zones(branch_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON public.departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_positions_branch   ON public.positions(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch   ON public.employees(branch_id);

-- ============================================
-- A3. Per-POP unique client code
-- ============================================
-- Drop any existing constraint that might conflict
DROP INDEX IF EXISTS public.uniq_client_id_per_branch;
CREATE UNIQUE INDEX uniq_client_id_per_branch
  ON public.clients(branch_id, client_id)
  WHERE client_id IS NOT NULL AND branch_id IS NOT NULL;

-- ============================================
-- A4. Auto-generate POP client code
-- ============================================
CREATE SEQUENCE IF NOT EXISTS public.pop_client_code_seq;

CREATE OR REPLACE FUNCTION public.set_client_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pop_code text;
  v_seq bigint;
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.client_id <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS NOT NULL THEN
    SELECT pop_code INTO v_pop_code
    FROM public.branch_managers
    WHERE branch_id = NEW.branch_id
    LIMIT 1;
  END IF;

  v_pop_code := COALESCE(v_pop_code, '0000');
  v_seq := nextval('public.pop_client_code_seq');
  NEW.client_id := v_pop_code || '-' || lpad(v_seq::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_client_code ON public.clients;
CREATE TRIGGER trg_set_client_code
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_client_code();

-- ============================================
-- RLS: ensure portal can read scoped tables
-- (portal-auth uses service-role key so it bypasses RLS,
--  but anon read needed by some queries)
-- ============================================
ALTER TABLE public.boxes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_zones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='boxes' AND policyname='boxes_all_access') THEN
    CREATE POLICY "boxes_all_access" ON public.boxes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sub_zones' AND policyname='sub_zones_all_access') THEN
    CREATE POLICY "sub_zones_all_access" ON public.sub_zones FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='departments_all_access') THEN
    CREATE POLICY "departments_all_access" ON public.departments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='positions' AND policyname='positions_all_access') THEN
    CREATE POLICY "positions_all_access" ON public.positions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employees' AND policyname='employees_all_access') THEN
    CREATE POLICY "employees_all_access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;