-- Seed common ISP support categories (skip if exists by name)
INSERT INTO public.support_categories (name, status)
SELECT v.name, 'active'
FROM (VALUES
  ('Internet Slow'),
  ('Line Shifting'),
  ('Fiber Cut'),
  ('Router Shifting'),
  ('Package Change'),
  ('Password Change'),
  ('ONU/Device Issue'),
  ('Payment Issue')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_categories sc WHERE lower(sc.name) = lower(v.name)
);