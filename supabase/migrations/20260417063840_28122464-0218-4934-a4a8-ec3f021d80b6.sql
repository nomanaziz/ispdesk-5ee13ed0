
-- Add transfer tracking to mikrotik_clients
ALTER TABLE public.mikrotik_clients
  ADD COLUMN IF NOT EXISTS transferred_to_pop_id uuid REFERENCES public.branch_managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_to_mikrotik_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS transferred_by uuid;

CREATE INDEX IF NOT EXISTS idx_mikrotik_clients_transferred_pop ON public.mikrotik_clients(transferred_to_pop_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_clients_transferred_mt ON public.mikrotik_clients(transferred_to_mikrotik_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_clients_name_lower ON public.mikrotik_clients(lower(name));
CREATE INDEX IF NOT EXISTS idx_mikrotik_clients_caller ON public.mikrotik_clients(caller_id);
