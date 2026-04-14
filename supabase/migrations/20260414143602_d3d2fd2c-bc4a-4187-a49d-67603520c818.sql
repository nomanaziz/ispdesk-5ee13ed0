
-- Leave balances per employee per category per year
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.leave_categories(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  total_days integer NOT NULL DEFAULT 0,
  used_days integer NOT NULL DEFAULT 0,
  remaining_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, category_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage leave_balances"
ON public.leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add fields to leave_applications
ALTER TABLE public.leave_applications
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS remarks text;

-- Add description to leave_categories
ALTER TABLE public.leave_categories
ADD COLUMN IF NOT EXISTS description text;
