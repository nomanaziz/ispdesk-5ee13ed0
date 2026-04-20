-- POP district/upazila allotment (admin assigns operating areas to a POP)
CREATE TABLE IF NOT EXISTS public.pop_district_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_manager_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  upazila_ids uuid[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_manager_id, district_id)
);

ALTER TABLE public.pop_district_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pop district assignments"
  ON public.pop_district_assignments FOR SELECT USING (true);

CREATE POLICY "Admins manage pop district assignments"
  ON public.pop_district_assignments FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Per-POP billing period settings
CREATE TABLE IF NOT EXISTS public.pop_billing_periods (
  branch_manager_id uuid PRIMARY KEY REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  period_type text NOT NULL DEFAULT 'monthly',
  generate_day smallint NOT NULL DEFAULT 1,
  due_days smallint NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pop_billing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pop billing periods"
  ON public.pop_billing_periods FOR SELECT USING (true);

CREATE POLICY "Admins manage pop billing periods"
  ON public.pop_billing_periods FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_pop_billing_periods_updated_at
  BEFORE UPDATE ON public.pop_billing_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();