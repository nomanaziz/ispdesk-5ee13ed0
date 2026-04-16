

## Online Client Monitoring পেজ — DONE

### Implemented:
1. **Edge Function — `collect-client-traffic`**: প্রতি ১৫ মিনিটে MikroTik থেকে bandwidth data collect করে
2. **DB Table — `client_traffic_logs`**: Traffic log storage
3. **Clients কলাম**: `total_upload`, `total_download` যোগ হয়েছে
4. **Monitoring Page**: 4টি action (Live Traffic, Ping, Re-check, SMS), bulk SMS, upload/download columns
5. **`manage-mikrotik-ppp` — `ping` action**: MikroTik `/ping` command support

### Pending: pg_cron job
Supabase SQL Editor-এ নিচের SQL চালাতে হবে:
```sql
SELECT cron.schedule(
  'collect-client-traffic',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://hdrhscfambaswndxqzau.supabase.co/functions/v1/collect-client-traffic',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmhzY2ZhbWJhc3duZHhxemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjYzNDksImV4cCI6MjA5MTMwMjM0OX0.rzo22ZIeWq7Ti-rHylaDT2hWNHNruoUdyr9X3asXHXY"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
```
