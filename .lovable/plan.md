

## Online Monitoring — Actions, Bulk SMS, Traffic Data Collection

Online Monitoring পেজে ৪টি action button, bulk SMS, total upload/download columns, এবং প্রতি ১৫ মিনিটে bandwidth data collection যোগ হবে।

---

### 1. নতুন DB Table — `client_traffic_logs`

প্রতি ১৫ মিনিটে প্রতিটি online client-এর bandwidth data সংরক্ষণ করবে:

```sql
client_id (uuid, FK → clients.id)
username (text)
device_id (uuid, FK → mikrotik_devices.id)
upload_bytes (bigint)     -- সেই interval-এ কত upload
download_bytes (bigint)   -- সেই interval-এ কত download
recorded_at (timestamptz) -- কখন record করা হয়েছে
```

### 2. Clients টেবিলে নতুন কলাম

`total_upload` (bigint, default 0) এবং `total_download` (bigint, default 0) — মাসিক cumulative data। প্রতি ১৫ মিনিটে edge function এই values increment করবে।

### 3. Edge Function — `collect-client-traffic`

নতুন edge function তৈরি হবে যা pg_cron দিয়ে প্রতি ১৫ মিনিটে চলবে:

**কাজ:**
- প্রতিটি enabled MikroTik device-এ connect করবে
- `/ppp/active/print` চালিয়ে online clients পাবে — এখানে `bytes-in` ও `bytes-out` থাকে
- আগের log-এর সাথে diff করে interval data বের করবে
- `client_traffic_logs`-এ insert করবে
- `clients.total_upload` ও `clients.total_download` increment করবে

**Logic:**
- MikroTik active session-এ `bytes-in` = total download from session start
- প্রতিবার collect করার সময় আগের reading-এর সাথে compare করে delta বের করবে
- প্রথমবার collect হলে (আগের reading নেই) পুরো value নেবে

### 4. Online Monitoring — Action Column

প্রতিটি online client-এর row-তে ৪টি action button:

| Action | কাজ |
|--------|-----|
| **Live Traffic** | `manage-mikrotik-ppp` action: `status` call করবে, live rx/tx bps দেখাবে dialog-এ |
| **Ping** | Client-এর IP address-এ `/ping` MikroTik command চালাবে, result দেখাবে |
| **Re-check** | সেই specific client-এর active session re-fetch করবে |
| **SMS** | SMS dialog খুলবে, client-এর mobile number pre-filled |

### 5. Online Monitoring — Upload/Download Columns

Table-তে দুটি নতুন column:
- **Total Upload** — `clients.total_upload` থেকে (formatted: MB/GB)
- **Total Download** — `clients.total_download` থেকে

### 6. Bulk SMS

Online tab ও Offline tab-এ checkbox + "SMS Selected" button:
- Selected clients-এর numbers collect করবে
- Existing SMS send flow (`sms_gateways` + `sms_logs`) ব্যবহার করবে
- Online/Offline filter দিয়ে all online বা all offline-কে একসাথে SMS দেওয়া যাবে

### 7. `manage-mikrotik-ppp` — নতুন action `ping`

Client-এর IP-তে `/ping` command চালাবে:
```
/ping address=<client_ip> count=4
```
Result return করবে (sent, received, avg-rtt)।

---

### ফাইল পরিবর্তন

| File | Change |
|------|--------|
| **Migration** | `client_traffic_logs` table তৈরি + `clients`-এ `total_upload`, `total_download` column যোগ |
| `supabase/functions/collect-client-traffic/index.ts` | **নতুন** — ১৫ মিনিটে bandwidth data collect |
| `supabase/functions/manage-mikrotik-ppp/index.ts` | `ping` action যোগ |
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | Action buttons, upload/download columns, bulk SMS, checkbox selection |
| **pg_cron setup** | ১৫ মিনিট interval-এ `collect-client-traffic` call করার cron job |

