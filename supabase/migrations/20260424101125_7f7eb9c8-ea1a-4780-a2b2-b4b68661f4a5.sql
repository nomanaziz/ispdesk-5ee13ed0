-- 1. leave_policies table
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('department','designation')),
  scope_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.leave_categories(id) ON DELETE CASCADE,
  days_allowed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_scope ON public.leave_policies(scope_type, scope_id);

ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view leave policies" ON public.leave_policies;
CREATE POLICY "Authenticated can view leave policies"
  ON public.leave_policies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert leave policies" ON public.leave_policies;
CREATE POLICY "Authenticated can insert leave policies"
  ON public.leave_policies FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update leave policies" ON public.leave_policies;
CREATE POLICY "Authenticated can update leave policies"
  ON public.leave_policies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete leave policies" ON public.leave_policies;
CREATE POLICY "Authenticated can delete leave policies"
  ON public.leave_policies FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_leave_policies_updated_at ON public.leave_policies;
CREATE TRIGGER update_leave_policies_updated_at
  BEFORE UPDATE ON public.leave_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed default leave categories (idempotent by name)
INSERT INTO public.leave_categories (name, days_allowed, status, description)
SELECT v.name, v.days, 'active', v.description
FROM (VALUES
  ('Earn Leave', 15, 'Annual earned leave'),
  ('Religious Holidays', 5, 'Religious / festival holidays'),
  ('Unpaid Leave', 0, 'Leave without pay'),
  ('Maternity Leave', 90, 'Maternity leave'),
  ('Casual Leave', 10, 'Casual leave'),
  ('Sick Leave', 12, 'Medical / sick leave')
) AS v(name, days, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_categories lc WHERE lower(lc.name) = lower(v.name)
);