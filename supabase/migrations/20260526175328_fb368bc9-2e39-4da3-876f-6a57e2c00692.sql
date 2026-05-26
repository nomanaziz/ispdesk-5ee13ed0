ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS adjustments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS period_label text;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS notes text;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_employee_month_uniq ON public.payroll(employee_id, month);