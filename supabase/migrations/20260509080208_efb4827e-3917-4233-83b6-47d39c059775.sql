DO $$
BEGIN
  PERFORM cron.unschedule('mikrotik-sync-online-2m')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mikrotik-sync-online-2m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'mikrotik-sync-online-2m',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdrhscfambaswndxqzau.supabase.co/functions/v1/fetch-mikrotik-ppp',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body := '{"action":"sync-online"}'::jsonb
  );
  $$
);