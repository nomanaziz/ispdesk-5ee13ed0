-- 1) Extend clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS installed_by_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS expire_day integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS billing_start_month text;

-- 2) Create billing_history
CREATE TABLE IF NOT EXISTS public.billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id uuid REFERENCES public.billing(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('generated','edited','prorated')),
  old_value jsonb,
  new_value jsonb,
  remarks text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_billing_id ON public.billing_history(billing_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_client_id ON public.billing_history(client_id);

ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage billing_history"
  ON public.billing_history
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated read billing_history"
  ON public.billing_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert billing_history"
  ON public.billing_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);