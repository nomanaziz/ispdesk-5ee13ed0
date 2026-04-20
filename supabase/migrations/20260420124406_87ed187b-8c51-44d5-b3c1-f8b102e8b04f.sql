-- 1. Add new columns to branch_funding
ALTER TABLE public.branch_funding
  ADD COLUMN IF NOT EXISTS received_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS received_by uuid,
  ADD COLUMN IF NOT EXISTS received_on date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS processing_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trans_type text NOT NULL DEFAULT 'fund',
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Unique invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS branch_funding_invoice_number_key
  ON public.branch_funding(invoice_number)
  WHERE invoice_number IS NOT NULL;

-- 2. Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.branch_funding_invoice_seq START 1;

-- 3. Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION public.set_branch_funding_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'FND-' || lpad(nextval('public.branch_funding_invoice_seq')::text, 6, '0')
                          || 't' || to_char(now(), 'YYYYMMDD') || 'PV';
  END IF;
  IF NEW.received_on IS NULL THEN
    NEW.received_on := COALESCE(NEW.funding_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_branch_funding_invoice ON public.branch_funding;
CREATE TRIGGER trg_set_branch_funding_invoice
  BEFORE INSERT ON public.branch_funding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_branch_funding_invoice();

-- 4. Trigger to credit POP balance on fund insert
CREATE OR REPLACE FUNCTION public.apply_branch_funding_to_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric := 0;
BEGIN
  IF NEW.branch_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Funding credits the POP balance; refund debits it
  IF NEW.trans_type = 'refund' THEN
    v_delta := -COALESCE(NEW.amount, 0);
  ELSE
    v_delta := COALESCE(NEW.amount, 0);
  END IF;

  IF v_delta <> 0 THEN
    UPDATE public.branch_managers
       SET balance = COALESCE(balance, 0) + v_delta
     WHERE branch_id = NEW.branch_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_branch_funding_to_balance ON public.branch_funding;
CREATE TRIGGER trg_apply_branch_funding_to_balance
  AFTER INSERT ON public.branch_funding
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_branch_funding_to_balance();