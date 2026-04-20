-- Trigger function to seed default zone/sub-zone/box hierarchy for a POP branch
CREATE OR REPLACE FUNCTION public.seed_default_pop_hierarchy_for_branch(_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pop_code text;
  v_zone_id uuid;
  v_subzone_id uuid;
  v_zone_names text[] := ARRAY['olt-1 pon-1','olt-1 pon-2','olt-1 pon-3','olt-1 pon-4'];
  v_zone_codes text[] := ARRAY['PON1','PON2','PON3','PON4'];
  i int;
  j int;
BEGIN
  IF _branch_id IS NULL THEN
    RETURN;
  END IF;

  SELECT pop_code INTO v_pop_code FROM public.branch_managers WHERE branch_id = _branch_id LIMIT 1;
  v_pop_code := COALESCE(v_pop_code, '0000');

  FOR i IN 1..4 LOOP
    -- Zone (skip if exists)
    SELECT id INTO v_zone_id
      FROM public.zones
      WHERE branch_id = _branch_id AND name = v_zone_names[i]
      LIMIT 1;

    IF v_zone_id IS NULL THEN
      INSERT INTO public.zones (name, code, branch_id, status)
      VALUES (v_zone_names[i], v_zone_codes[i], _branch_id, 'active')
      RETURNING id INTO v_zone_id;
    END IF;

    -- Sub-zone (one per zone)
    SELECT id INTO v_subzone_id
      FROM public.sub_zones
      WHERE branch_id = _branch_id AND zone_id = v_zone_id AND name = 'Main Splitter 1:8'
      LIMIT 1;

    IF v_subzone_id IS NULL THEN
      INSERT INTO public.sub_zones (name, zone_id, branch_id, status)
      VALUES ('Main Splitter 1:8', v_zone_id, _branch_id, 'active')
      RETURNING id INTO v_subzone_id;
    END IF;

    -- 8 boxes per sub-zone
    FOR j IN 1..8 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.boxes
        WHERE branch_id = _branch_id
          AND sub_zone_id = v_subzone_id
          AND name = 'sub-Splitter 1:8 ' || j
      ) THEN
        INSERT INTO public.boxes (name, code, zone_id, sub_zone_id, branch_id, status)
        VALUES (
          'sub-Splitter 1:8 ' || j,
          v_pop_code || '-' || v_zone_codes[i] || '-B' || j,
          v_zone_id, v_subzone_id, _branch_id, 'active'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger wrapper for branch_managers
CREATE OR REPLACE FUNCTION public.seed_default_pop_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    PERFORM public.seed_default_pop_hierarchy_for_branch(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_pop_hierarchy ON public.branch_managers;
CREATE TRIGGER trg_seed_default_pop_hierarchy
AFTER INSERT OR UPDATE OF branch_id ON public.branch_managers
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_pop_hierarchy();

-- Backfill: seed for all existing POPs with a branch_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT branch_id FROM public.branch_managers WHERE branch_id IS NOT NULL LOOP
    PERFORM public.seed_default_pop_hierarchy_for_branch(r.branch_id);
  END LOOP;
END;
$$;