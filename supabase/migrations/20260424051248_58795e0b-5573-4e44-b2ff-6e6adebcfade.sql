
CREATE OR REPLACE FUNCTION public.trg_bw_panel_subscription_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_ref text;
BEGIN
  -- Only fire on transition to paid
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.paid_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_ref := 'bw_panel_sub:' || NEW.id::text;

  -- Avoid duplicates
  IF EXISTS (SELECT 1 FROM public.income_entries WHERE reference = v_ref) THEN
    RETURN NEW;
  END IF;

  SELECT customer_name INTO v_customer_name
    FROM public.bw_sale_customers WHERE id = NEW.customer_id;

  INSERT INTO public.income_entries (
    amount, source, description, income_date, reference, month,
    payment_method, status
  ) VALUES (
    NEW.paid_amount,
    'panel_subscription',
    'Panel/Portal subscription — ' || COALESCE(v_customer_name, 'BW Customer')
      || ' (' || to_char(NEW.period_start, 'YYYY-MM') || ')',
    CURRENT_DATE,
    v_ref,
    to_char(NEW.period_start, 'YYYY-MM'),
    NEW.payment_method,
    'received'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bw_panel_subscription_income_trg ON public.bw_panel_subscriptions;
CREATE TRIGGER bw_panel_subscription_income_trg
AFTER INSERT OR UPDATE OF status ON public.bw_panel_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trg_bw_panel_subscription_to_income();
