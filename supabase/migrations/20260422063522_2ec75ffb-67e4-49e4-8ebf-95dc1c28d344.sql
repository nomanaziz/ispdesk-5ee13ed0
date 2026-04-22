-- Employee user access columns
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS has_user_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_username TEXT,
  ADD COLUMN IF NOT EXISTS user_password TEXT,
  ADD COLUMN IF NOT EXISTS user_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sub_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_employees_user_username ON public.employees(user_username) WHERE user_username IS NOT NULL;

-- Ensure indexes exist on accounting tables (using existing column names)
CREATE INDEX IF NOT EXISTS idx_income_entries_branch_date ON public.income_entries(branch_id, income_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_entries_branch_date ON public.expense_entries(branch_id, expense_date DESC);