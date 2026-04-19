-- 1. Create asset_assignments table
CREATE TABLE public.asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_no text,
  recipient_type text NOT NULL CHECK (recipient_type IN ('client','bw_customer','reseller','vendor','other')),
  recipient_id uuid,
  recipient_name text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  returned_at timestamptz,
  returned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_assignments_recipient ON public.asset_assignments(recipient_type, recipient_id);
CREATE INDEX idx_asset_assignments_item ON public.asset_assignments(inventory_item_id);
CREATE INDEX idx_asset_assignments_status ON public.asset_assignments(status);

-- 2. Updated-at trigger
CREATE TRIGGER trg_asset_assignments_updated_at
BEFORE UPDATE ON public.asset_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Stock sync trigger function
CREATE OR REPLACE FUNCTION public.sync_asset_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.inventory_items
        SET quantity = COALESCE(quantity,0) - NEW.quantity
        WHERE id = NEW.inventory_item_id;
      INSERT INTO public.stock_movements(item_id, movement_type, quantity, reference, note)
      VALUES (NEW.inventory_item_id, 'out', NEW.quantity, NEW.id::text, 'Assigned to ' || NEW.recipient_name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'returned' THEN
      UPDATE public.inventory_items
        SET quantity = COALESCE(quantity,0) + OLD.quantity
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.stock_movements(item_id, movement_type, quantity, reference, note)
      VALUES (OLD.inventory_item_id, 'in', OLD.quantity, OLD.id::text, 'Returned from ' || OLD.recipient_name);
    ELSIF OLD.status = 'returned' AND NEW.status = 'active' THEN
      UPDATE public.inventory_items
        SET quantity = COALESCE(quantity,0) - NEW.quantity
        WHERE id = NEW.inventory_item_id;
      INSERT INTO public.stock_movements(item_id, movement_type, quantity, reference, note)
      VALUES (NEW.inventory_item_id, 'out', NEW.quantity, NEW.id::text, 'Re-assigned to ' || NEW.recipient_name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.inventory_items
        SET quantity = COALESCE(quantity,0) + OLD.quantity
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.stock_movements(item_id, movement_type, quantity, reference, note)
      VALUES (OLD.inventory_item_id, 'in', OLD.quantity, OLD.id::text, 'Assignment deleted');
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_asset_assignments_stock_sync
AFTER INSERT OR UPDATE OR DELETE ON public.asset_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_asset_stock();

-- 4. RLS
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read asset assignments"
ON public.asset_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage asset assignments insert"
ON public.asset_assignments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage asset assignments update"
ON public.asset_assignments FOR UPDATE
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage asset assignments delete"
ON public.asset_assignments FOR DELETE
TO authenticated
USING (public.is_admin_or_super(auth.uid()));