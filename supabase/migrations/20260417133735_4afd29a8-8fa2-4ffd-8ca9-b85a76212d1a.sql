-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with the same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('collect-client-traffic-15m');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the collector to run every 15 minutes
SELECT cron.schedule(
  'collect-client-traffic-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdrhscfambaswndxqzau.supabase.co/functions/v1/collect-client-traffic',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Helpful index for monthly history lookups
CREATE INDEX IF NOT EXISTS idx_traffic_monthly_client_month
  ON public.client_traffic_monthly (client_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_logs_client_recorded
  ON public.client_traffic_logs (client_id, recorded_at DESC);