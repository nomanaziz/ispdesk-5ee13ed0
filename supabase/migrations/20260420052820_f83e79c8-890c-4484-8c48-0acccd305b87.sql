ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS allow_negative_balance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_disable_day smallint NOT NULL DEFAULT 10;

ALTER TABLE public.branch_managers
  DROP CONSTRAINT IF EXISTS branch_managers_auto_disable_day_check;

ALTER TABLE public.branch_managers
  ADD CONSTRAINT branch_managers_auto_disable_day_check
  CHECK (auto_disable_day BETWEEN 1 AND 28);