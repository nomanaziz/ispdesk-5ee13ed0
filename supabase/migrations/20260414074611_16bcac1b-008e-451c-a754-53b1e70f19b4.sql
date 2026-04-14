
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id),
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id),
  ADD COLUMN IF NOT EXISTS upazila_id uuid REFERENCES public.upazilas(id);

CREATE INDEX IF NOT EXISTS idx_zones_division_id ON public.zones(division_id);
CREATE INDEX IF NOT EXISTS idx_zones_district_id ON public.zones(district_id);
CREATE INDEX IF NOT EXISTS idx_zones_upazila_id ON public.zones(upazila_id);
