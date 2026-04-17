-- 1. portal_login_log table
CREATE TABLE IF NOT EXISTS public.portal_login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  username text NOT NULL,
  user_type text NOT NULL DEFAULT 'client',
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  ip_address text,
  user_agent text,
  session_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_login_log_client ON public.portal_login_log(client_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_login_log_session ON public.portal_login_log(session_id);

ALTER TABLE public.portal_login_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert login log"
  ON public.portal_login_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update login log"
  ON public.portal_login_log FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated can view login log"
  ON public.portal_login_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. client_news_events table
CREATE TABLE IF NOT EXISTS public.client_news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  details text,
  photo_url text,
  type text NOT NULL DEFAULT 'news',
  event_date date,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active news/events"
  ON public.client_news_events FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert news/events"
  ON public.client_news_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update news/events"
  ON public.client_news_events FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete news/events"
  ON public.client_news_events FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_client_news_events_updated_at
  BEFORE UPDATE ON public.client_news_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. system_settings entries (correct column names)
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES
  ('speed_test_mode', to_jsonb('demo'::text)),
  ('speed_test_url', to_jsonb('https://www.speedtest.net'::text)),
  ('portal_default_password_source', to_jsonb('mobile'::text))
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Backfill missing client credentials
UPDATE public.clients
SET username = client_id
WHERE (username IS NULL OR username = '') AND client_id IS NOT NULL;

UPDATE public.clients
SET password = COALESCE(NULLIF(contact, ''), client_id)
WHERE (password IS NULL OR password = '');