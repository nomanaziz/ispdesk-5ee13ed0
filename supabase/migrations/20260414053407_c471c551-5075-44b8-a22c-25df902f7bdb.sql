
-- Allow anonymous users to view active ISP packages (for /packages page)
CREATE POLICY "Anyone can view active isp_packages"
ON public.isp_packages
FOR SELECT
TO anon
USING (status = 'active');

-- Allow anonymous users to view active zones (for /coverage and /new-connection pages)
CREATE POLICY "Anyone can view active zones"
ON public.zones
FOR SELECT
TO anon
USING (status = 'active');

-- Allow anonymous users to view active sub_zones (for /coverage page)
CREATE POLICY "Anyone can view active sub_zones"
ON public.sub_zones
FOR SELECT
TO anon
USING (status = 'active');

-- Allow anonymous users to submit connection requests (for /new-connection page)
CREATE POLICY "Anyone can insert client_requests"
ON public.client_requests
FOR INSERT
TO anon
WITH CHECK (true);
