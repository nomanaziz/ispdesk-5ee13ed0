ALTER TABLE public.website_menu
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'header';

UPDATE public.website_menu SET location = 'header' WHERE location IS NULL OR location = '';

CREATE INDEX IF NOT EXISTS idx_website_menu_location_status ON public.website_menu(location, status, sort_order);