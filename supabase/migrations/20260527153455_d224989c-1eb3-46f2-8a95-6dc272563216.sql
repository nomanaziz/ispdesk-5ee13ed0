-- Deduplicate designations: keep oldest row per name, remap references, delete rest
WITH ranked AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY name ORDER BY created_at, id) AS keep_id
  FROM public.designations
)
UPDATE public.leave_policies lp
SET scope_id = r.keep_id
FROM ranked r
WHERE lp.scope_type = 'designation' AND lp.scope_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM public.designations
)
DELETE FROM public.designations d USING ranked r WHERE d.id = r.id AND r.rn > 1;

ALTER TABLE public.designations ADD CONSTRAINT designations_name_unique UNIQUE (name);