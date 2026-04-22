-- Add division/district/upazila FK to employees (keep existing district/upazila text for backward compat)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id),
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id),
  ADD COLUMN IF NOT EXISTS upazila_id uuid REFERENCES public.upazilas(id);

-- Extend salary_sheets for POP simple payroll
ALTER TABLE public.salary_sheets
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS paid_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incentive numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_date timestamptz,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_salary_sheets_branch ON public.salary_sheets(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_division ON public.employees(division_id);
CREATE INDEX IF NOT EXISTS idx_employees_district ON public.employees(district_id);
CREATE INDEX IF NOT EXISTS idx_employees_upazila ON public.employees(upazila_id);

-- RLS for salary_sheets — branch-scoped read/write for POP portal (anon access via portal session)
ALTER TABLE public.salary_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_sheets_portal_all" ON public.salary_sheets;
CREATE POLICY "salary_sheets_portal_all"
ON public.salary_sheets
FOR ALL
USING (true)
WITH CHECK (true);