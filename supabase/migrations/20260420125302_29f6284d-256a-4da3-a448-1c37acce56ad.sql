
-- 1. branch_managers: auto-settle flag
ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS auto_settle_pgw boolean NOT NULL DEFAULT false;

-- 2. reseller_pgw_payments: settlement tracking columns
ALTER TABLE public.reseller_pgw_payments
  ADD COLUMN IF NOT EXISTS settled_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'pending';

-- Backfill remaining_amount = our_share - settled_amount
UPDATE public.reseller_pgw_payments
   SET remaining_amount = COALESCE(our_share,0) - COALESCE(settled_amount,0),
       settlement_status = CASE
         WHEN COALESCE(settled_amount,0) <= 0 THEN 'pending'
         WHEN COALESCE(settled_amount,0) >= COALESCE(our_share,0) THEN 'settled'
         ELSE 'partial'
       END
 WHERE remaining_amount = 0 AND settled_amount = 0;

-- 3. reseller_pgw_settlements: link & type columns
ALTER TABLE public.reseller_pgw_settlements
  ADD COLUMN IF NOT EXISTS settlement_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS funding_id uuid NULL REFERENCES public.branch_funding(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pgw_payment_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS receipt_no text NULL,
  ADD COLUMN IF NOT EXISTS payment_date date NULL DEFAULT CURRENT_DATE;

-- 4. FIFO allocator trigger function
CREATE OR REPLACE FUNCTION public.apply_settlement_to_pgw_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric := COALESCE(NEW.amount, 0);
  v_alloc numeric;
  v_ids uuid[] := ARRAY[]::uuid[];
  r RECORD;
BEGIN
  IF NEW.reseller_id IS NULL OR v_remaining <= 0 THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT id, COALESCE(our_share,0) - COALESCE(settled_amount,0) AS pending
      FROM public.reseller_pgw_payments
     WHERE reseller_id = NEW.reseller_id
       AND COALESCE(settlement_status,'pending') <> 'settled'
       AND COALESCE(our_share,0) - COALESCE(settled_amount,0) > 0
     ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_alloc := LEAST(r.pending, v_remaining);
    UPDATE public.reseller_pgw_payments
       SET settled_amount = COALESCE(settled_amount,0) + v_alloc,
           remaining_amount = COALESCE(our_share,0) - (COALESCE(settled_amount,0) + v_alloc),
           settlement_status = CASE
             WHEN COALESCE(our_share,0) - (COALESCE(settled_amount,0) + v_alloc) <= 0 THEN 'settled'
             ELSE 'partial'
           END
     WHERE id = r.id;
    v_ids := array_append(v_ids, r.id);
    v_remaining := v_remaining - v_alloc;
  END LOOP;

  IF NEW.pgw_payment_ids IS NULL OR array_length(NEW.pgw_payment_ids,1) IS NULL THEN
    UPDATE public.reseller_pgw_settlements SET pgw_payment_ids = v_ids WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_settlement_to_pgw_payments ON public.reseller_pgw_settlements;
CREATE TRIGGER trg_apply_settlement_to_pgw_payments
  AFTER INSERT ON public.reseller_pgw_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_settlement_to_pgw_payments();

-- 5. Index for FIFO query performance
CREATE INDEX IF NOT EXISTS idx_pgw_payments_reseller_pending
  ON public.reseller_pgw_payments(reseller_id, created_at)
  WHERE settlement_status <> 'settled';
