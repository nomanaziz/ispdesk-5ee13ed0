ALTER TABLE public.mikrotik_devices ADD COLUMN IF NOT EXISTS order_no integer;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.mikrotik_devices
)
UPDATE public.mikrotik_devices m
SET order_no = r.rn
FROM ranked r
WHERE m.id = r.id AND m.order_no IS NULL;

CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_order_no ON public.mikrotik_devices(order_no);