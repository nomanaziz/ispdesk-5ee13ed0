ALTER TABLE public.store_locations ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS store_locations_code_key ON public.store_locations(code) WHERE code IS NOT NULL;

INSERT INTO public.store_locations (name, code, address, status)
SELECT 'Main Store', 'MAIN-01', 'Head Office', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.store_locations WHERE code = 'MAIN-01');