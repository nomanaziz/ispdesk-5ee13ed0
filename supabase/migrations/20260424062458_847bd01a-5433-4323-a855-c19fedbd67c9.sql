
SELECT cron.schedule(
  'enforce-billing-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdrhscfambaswndxqzau.supabase.co/functions/v1/enforce-billing',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body := jsonb_build_object('triggered_by','cron','time', now())
  ) AS request_id;
  $$
);
