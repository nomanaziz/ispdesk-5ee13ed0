
-- 1. Trim whitespace
UPDATE public.departments SET name = btrim(name);

-- 2. For each duplicate group, pick a canonical id (earliest created) and repoint refs
WITH ranked AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY lower(name) ORDER BY created_at) AS keep_id
  FROM public.departments
)
UPDATE public.employees e
SET department_id = r.keep_id
FROM ranked r
WHERE e.department_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY lower(name) ORDER BY created_at) AS keep_id
  FROM public.departments
)
UPDATE public.positions p
SET department_id = r.keep_id
FROM ranked r
WHERE p.department_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY lower(name) ORDER BY created_at) AS keep_id
  FROM public.departments
)
UPDATE public.rejoin_requests rj
SET new_department_id = r.keep_id
FROM ranked r
WHERE rj.new_department_id = r.id AND r.rn > 1;

-- 3. Delete duplicates
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at) AS rn
  FROM public.departments
)
DELETE FROM public.departments
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. Make all departments global
UPDATE public.departments SET branch_id = NULL;

-- 5. Add unique constraint on lowercased name
CREATE UNIQUE INDEX IF NOT EXISTS departments_name_unique_idx ON public.departments (lower(name));

-- 6. Insert the missing departments from the user's list
INSERT INTO public.departments (name, status)
SELECT v.name, 'active'
FROM (VALUES
  ('Branch Manager'),
  ('Office Staff'),
  ('Service'),
  ('Sales And Marketing'),
  ('Billing'),
  ('Customer Support'),
  ('Accounts'),
  ('Management')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments d WHERE lower(d.name) = lower(v.name)
);
