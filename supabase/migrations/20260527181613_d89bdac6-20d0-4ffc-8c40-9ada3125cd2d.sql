CREATE OR REPLACE FUNCTION public.set_requisition_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.requisition_no IS NULL OR NEW.requisition_no = '' THEN
    NEW.requisition_no := 'REQ-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_requisition_no ON public.requisitions;
CREATE TRIGGER trg_set_requisition_no
BEFORE INSERT ON public.requisitions
FOR EACH ROW EXECUTE FUNCTION public.set_requisition_no();