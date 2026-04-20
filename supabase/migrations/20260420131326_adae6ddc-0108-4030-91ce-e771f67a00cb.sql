CREATE OR REPLACE FUNCTION public.apply_branch_funding_delete_to_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric := 0;
BEGIN
  IF OLD.branch_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Reverse the original effect: fund added, so deleting it should subtract; refund subtracted, so deleting it should add back
  IF OLD.trans_type = 'refund' THEN
    v_delta := COALESCE(OLD.amount, 0);
  ELSE
    v_delta := -COALESCE(OLD.amount, 0);
  END IF;

  IF v_delta <> 0 THEN
    UPDATE public.branch_managers
       SET balance = COALESCE(balance, 0) + v_delta
     WHERE branch_id = OLD.branch_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_funding_after_delete ON public.branch_funding;
CREATE TRIGGER trg_branch_funding_after_delete
AFTER DELETE ON public.branch_funding
FOR EACH ROW
EXECUTE FUNCTION public.apply_branch_funding_delete_to_balance();