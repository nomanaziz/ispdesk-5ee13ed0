
-- Track in-flight POP self-recharge attempts before callback completes them
CREATE TABLE IF NOT EXISTS public.pop_fund_recharges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id uuid NOT NULL REFERENCES public.branch_managers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL,
  trx_id text,
  gateway_payment_id text,
  gateway_response jsonb,
  status text NOT NULL DEFAULT 'pending',
  funding_id uuid REFERENCES public.branch_funding(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS pop_fund_recharges_pop_idx ON public.pop_fund_recharges (pop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pop_fund_recharges_status_idx ON public.pop_fund_recharges (status);

ALTER TABLE public.pop_fund_recharges ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage all pop fund recharges"
ON public.pop_fund_recharges
FOR ALL
USING (true)
WITH CHECK (true);
