ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upazila_id uuid REFERENCES public.upazilas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_district_id ON public.clients(district_id);
CREATE INDEX IF NOT EXISTS idx_clients_upazila_id ON public.clients(upazila_id);