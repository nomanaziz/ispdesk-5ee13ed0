-- Schedule monthly billing on 1st at 00:05
SELECT cron.unschedule('monthly-billing-auto') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-billing-auto');

SELECT cron.schedule(
  'monthly-billing-auto',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url:='https://hdrhscfambaswndxqzau.supabase.co/functions/v1/generate-monthly-billing',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);