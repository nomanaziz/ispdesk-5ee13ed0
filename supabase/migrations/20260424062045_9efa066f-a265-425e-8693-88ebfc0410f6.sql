
-- Audit log for billing enforcement runs
CREATE TABLE IF NOT EXISTS public.billing_enforcement_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron',
  total_checked int NOT NULL DEFAULT 0,
  total_overdue int NOT NULL DEFAULT 0,
  total_disabled int NOT NULL DEFAULT 0,
  total_skipped_paid int NOT NULL DEFAULT 0,
  total_skipped_no_bill int NOT NULL DEFAULT 0,
  total_failed int NOT NULL DEFAULT 0,
  message text,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_enforcement_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enforcement runs"
ON public.billing_enforcement_runs
FOR SELECT
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Service role can insert enforcement runs"
ON public.billing_enforcement_runs
FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_billing_enforcement_runs_run_at
  ON public.billing_enforcement_runs(run_at DESC);
