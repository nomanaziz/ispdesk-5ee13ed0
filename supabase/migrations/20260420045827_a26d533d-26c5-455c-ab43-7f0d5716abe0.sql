-- Add tracking column
ALTER TABLE public.branch_managers
ADD COLUMN IF NOT EXISTS pop_type_changed_at TIMESTAMPTZ;

-- Trigger function: enforce 1 toggle per day
CREATE OR REPLACE FUNCTION public.enforce_pop_type_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.pop_type,'') IS DISTINCT FROM COALESCE(NEW.pop_type,'') THEN
    IF OLD.pop_type_changed_at IS NOT NULL
       AND OLD.pop_type_changed_at::date = CURRENT_DATE THEN
      RAISE EXCEPTION 'একই দিনে POP type একবারই পরিবর্তন করা যায় — পরের দিন আবার চেষ্টা করুন';
    END IF;
    NEW.pop_type_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pop_type_daily_limit ON public.branch_managers;
CREATE TRIGGER trg_enforce_pop_type_daily_limit
BEFORE UPDATE ON public.branch_managers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pop_type_daily_limit();