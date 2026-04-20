-- Add credit refund policy toggle to POPs
ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS credit_refund_policy boolean NOT NULL DEFAULT false;

-- Credit refund logs table
CREATE TABLE IF NOT EXISTS public.credit_refund_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  client_name text,
  client_username text,
  pop_id uuid NOT NULL,
  package_id uuid,
  package_name text,
  daily_rate numeric NOT NULL DEFAULT 0,
  paid_days integer NOT NULL DEFAULT 0,
  used_days integer NOT NULL DEFAULT 0,
  refund_days integer NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  pop_balance_before numeric,
  pop_balance_after numeric,
  reason text,
  status text NOT NULL DEFAULT 'completed',
  refunded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_refund_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage credit refund logs"
  ON public.credit_refund_logs FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "POPs view their own refund logs"
  ON public.credit_refund_logs FOR SELECT
  USING (
    pop_id IN (
      SELECT id FROM public.branch_managers WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_credit_refund_logs_pop ON public.credit_refund_logs(pop_id, refunded_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_refund_logs_client ON public.credit_refund_logs(client_id);

-- Trigger function: refund unused prepaid days when client is left/deleted
CREATE OR REPLACE FUNCTION public.process_credit_refund_on_client_left()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pop record;
  v_today date := CURRENT_DATE;
  v_expire date;
  v_unused_days integer;
  v_monthly_bill numeric;
  v_daily_rate numeric;
  v_refund numeric;
  v_balance_before numeric;
  v_client_row record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only fire when transitioning to "left" status
    IF COALESCE(OLD.status,'') = COALESCE(NEW.status,'') OR COALESCE(NEW.status,'') NOT IN ('left','inactive') THEN
      RETURN NEW;
    END IF;
    v_client_row := NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_client_row := OLD;
  ELSE
    RETURN NEW;
  END IF;

  IF v_client_row.branch_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, pop_type, credit_refund_policy, balance
    INTO v_pop
    FROM public.branch_managers
    WHERE branch_id = v_client_row.branch_id
    LIMIT 1;

  IF v_pop.id IS NULL OR v_pop.pop_type <> 'prepaid' OR v_pop.credit_refund_policy IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_expire := v_client_row.expire_date;
  IF v_expire IS NULL OR v_expire <= v_today THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_unused_days := v_expire - v_today;
  v_monthly_bill := COALESCE(v_client_row.monthly_bill, 0);
  IF v_monthly_bill <= 0 OR v_unused_days <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_daily_rate := v_monthly_bill / 30.0;
  v_refund := round((v_daily_rate * v_unused_days)::numeric, 2);

  IF v_refund <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_balance_before := COALESCE(v_pop.balance, 0);

  UPDATE public.branch_managers
    SET balance = COALESCE(balance,0) + v_refund
    WHERE id = v_pop.id;

  INSERT INTO public.credit_refund_logs(
    client_id, client_name, client_username, pop_id, package_id,
    daily_rate, paid_days, used_days, refund_days, refund_amount,
    pop_balance_before, pop_balance_after, reason, status
  ) VALUES (
    v_client_row.id, v_client_row.name, v_client_row.username, v_pop.id, v_client_row.package_id,
    v_daily_rate, 30, 30 - v_unused_days, v_unused_days, v_refund,
    v_balance_before, v_balance_before + v_refund,
    CASE WHEN TG_OP='DELETE' THEN 'Client deleted' ELSE 'Client marked as ' || NEW.status END,
    'completed'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_refund_on_client_left ON public.clients;
CREATE TRIGGER trg_credit_refund_on_client_left
  AFTER UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.process_credit_refund_on_client_left();