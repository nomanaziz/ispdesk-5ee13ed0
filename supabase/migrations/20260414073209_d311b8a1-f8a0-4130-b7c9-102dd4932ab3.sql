
-- Add description to client_types
ALTER TABLE public.client_types ADD COLUMN description text;

-- Add package_type to isp_packages (home, corporate, dedicated)
ALTER TABLE public.isp_packages ADD COLUMN package_type text DEFAULT 'home';
