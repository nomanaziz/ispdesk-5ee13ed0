select cron.schedule(
  'enforce-expired-disable-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url:='https://hdrhscfambaswndxqzau.supabase.co/functions/v1/enforce-expired-disable',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);