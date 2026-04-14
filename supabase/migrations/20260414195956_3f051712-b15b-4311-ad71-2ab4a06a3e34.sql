
-- Alter vas_services table
ALTER TABLE public.vas_services
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS provider_type text DEFAULT 'ott',
ADD COLUMN IF NOT EXISTS credentials_template text DEFAULT 'আপনার {service_name} ID: {username}, Password: {password}';

-- Create vas_subscriptions table
CREATE TABLE IF NOT EXISTS public.vas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.vas_services(id) ON DELETE CASCADE,
  vas_username text,
  vas_password text,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vas_subscriptions"
ON public.vas_subscriptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vas_subscriptions"
ON public.vas_subscriptions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vas_subscriptions"
ON public.vas_subscriptions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete vas_subscriptions"
ON public.vas_subscriptions FOR DELETE TO authenticated USING (true);

-- Pre-seed popular BD OTT platforms
INSERT INTO public.vas_services (name, description, price, status, provider_type) VALUES
  ('Bongo', 'Bongo BD OTT Platform', 0, 'active', 'ott'),
  ('Chorki', 'Chorki Streaming Platform', 0, 'active', 'ott'),
  ('Ayna', 'Ayna OTT Platform', 0, 'active', 'ott'),
  ('Hoichoi', 'Hoichoi Bengali Streaming', 0, 'active', 'ott'),
  ('Toffee', 'Grameenphone Toffee', 0, 'active', 'ott'),
  ('Bioscope', 'Bioscope Streaming', 0, 'active', 'ott')
ON CONFLICT DO NOTHING;
