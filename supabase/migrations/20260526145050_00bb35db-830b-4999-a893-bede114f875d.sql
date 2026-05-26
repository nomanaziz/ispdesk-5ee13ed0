CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old schedule if exists
SELECT cron.unschedule('snmp-poll-device-every-2min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'snmp-poll-device-every-2min'
);

SELECT cron.schedule(
  'snmp-poll-device-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdrhscfambaswndxqzau.supabase.co/functions/v1/snmp-poll-device',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body := '{"all": true}'::jsonb
  );
  $$
);