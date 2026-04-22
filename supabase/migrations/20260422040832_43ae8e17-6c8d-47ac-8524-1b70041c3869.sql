ALTER TABLE public.mikrotik_devices
  ADD COLUMN IF NOT EXISTS assigned_to_pop_id uuid REFERENCES public.branch_managers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_assigned_to_pop_id
  ON public.mikrotik_devices(assigned_to_pop_id);

-- Backfill: device-এ যদি কোনো POP-এ user transferred থাকে, তাহলে সেই POP-কে assigned হিসেবে set করো
UPDATE public.mikrotik_devices md
SET assigned_to_pop_id = sub.pop
FROM (
  SELECT mikrotik_id AS mt, transferred_to_pop_id AS pop, COUNT(*) AS c,
         ROW_NUMBER() OVER (PARTITION BY mikrotik_id ORDER BY COUNT(*) DESC) AS rn
  FROM public.mikrotik_clients
  WHERE transferred_to_pop_id IS NOT NULL AND mikrotik_id IS NOT NULL
  GROUP BY mikrotik_id, transferred_to_pop_id
) sub
WHERE md.id = sub.mt
  AND sub.rn = 1
  AND md.assigned_to_pop_id IS NULL;