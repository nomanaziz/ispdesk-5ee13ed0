

User issue: Online Client Monitoring table-এর "Traffic" column-এ upload/download value show করছে না (probably 0 B / 0 B দেখাচ্ছে)। User চান current session-এর upload/download data MB/GB-তে দেখাতে।

### Root cause investigation

Current code (table cell-এ Traffic column) সম্ভবত `s.total_upload` / `s.total_download` ব্যবহার করছে — এগুলো `clients` table-এর cumulative lifetime totals (যা cron job update করে), session-specific না।

MikroTik `/ppp/active` data যেটা `fetch-mikrotik-ppp` থেকে আসে, সেখানে প্রতিটা active session-এ আছে:
- `bytes-in` / `bytes-out` (current session-এর cumulative)
- অথবা interface-এর `rx-byte` / `tx-byte`

আমাকে check করতে হবে `OnlineClientMonitoring.tsx`-এ sessions data কোথা থেকে আসে এবং Traffic cell কী render করছে।
<lov-tool-use id="toolu_vrtx_01UVzDDk8wt5GUsAXsaSxmDv" name="code--search_files" integration-id="code" data="{\"query\": \"Traffic\", \"include_patterns\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01P2ggoxb8LNgJQs1LTzMxa7" name="code--search_files" integration-id="code" data="{\"query\": \"bytes-in|bytes-out|upload_bytes|download_bytes|session_upload|session_download\", \"include_patterns\": \"src/pages/dashboard/monitoring/*,supabase/functions/**/*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01G1G6dEaHmybR1qAHCkpQfW" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\", \"query\": \"Traffic|total_upload|total_download|bytes\"}">
</lov-tool-use>
Now let me find the Traffic column rendering:
<lov-tool-use id="toolu_vrtx_01CywwRFA16C8qNaH9evxr8Y" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\", \"query\": \"ArrowUp|ArrowDown|↑|↓|s\\\\.bytes|bytes-in|bytes-out|s\\\\.upload|s\\\\.download\"}">
</lov-tool-use>
Now I understand. The Traffic column currently uses `s.total_upload`/`s.total_download` which are cumulative client totals from DB (not current session bytes). The active PPP session has `bytes-in`/`bytes-out` from MikroTik. Let me check the ActiveSession interface:
<lov-tool-use id="toolu_vrtx_01UJo9MoB1vvDn4H39jC82YQ" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\", \"lines\": \"44-105\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WVBd9bcDRpBfcgE1LEEaG4" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\", \"lines\": \"22-44\"}">
</lov-tool-use>
Let me check where sessions are populated — what fields come from `/ppp/active`:
<lov-tool-use id="toolu_vrtx_01SBZ1bMDMUte8CXD8dnkxbU" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx\", \"query\": \"setSessions|active.map|fetch-mikrotik|ActiveSession =\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BW9GhhprnVgxCug1suSAnh" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"supabase/functions/fetch-mikrotik-ppp/index.ts\", \"query\": \"active-sessions|bytes-in|bytes-out|sessions\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GGnK9hcQJySaptQ98e79m3" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/fetch-mikrotik-ppp/index.ts\", \"lines\": \"242-320\"}">
</lov-tool-use>
এখন পরিষ্কার। MikroTik `/ppp/active/print`-এ `bytes-in`/`bytes-out` field থাকে যা current session-এর traffic। কিন্তু edge function এগুলো push করছে না, এবং UI cumulative `total_upload`/`total_download` দেখাচ্ছে যা সবসময় 0।

<lov-plan>

### সমস্যা
Traffic column-এ এখন `s.total_upload` / `s.total_download` (clients table-এর cumulative field) দেখাচ্ছে — যেগুলো সব 0 হওয়াতে কিছু আসছে না। User চান **current session-এর** upload/download (MB/GB), যেটা MikroTik `/ppp/active/print`-এ `bytes-in` / `bytes-out` হিসেবে আসে।

### সমাধান (২ ফাইল)

**1. `supabase/functions/fetch-mikrotik-ppp/index.ts`** (lines 244-253)
`active-sessions` action-এ session object-এ ২টা নতুন field যোগ:
```ts
session_upload_bytes: parseInt(ac["bytes-in"] || "0", 10),   // client → router = upload
session_download_bytes: parseInt(ac["bytes-out"] || "0", 10), // router → client = download
```

**2. `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`**
- `ActiveSession` interface-এ ২টা optional field যোগ: `session_upload_bytes?: number`, `session_download_bytes?: number`।
- Traffic column cell (lines 558-566): `s.total_upload` → `s.session_upload_bytes`, `s.total_download` → `s.session_download_bytes`। Offline rows-এ এগুলো 0 → `formatBytes(0)` → "0 B" দেখাবে (ঠিক আছে, offline-এ session নেই)।
- Offline rows তৈরির সময় (lines 153-175) এই field দুটো 0 set করব।

### ফলাফল
- Online client → real-time current session upload/download (MikroTik থেকে সরাসরি, প্রতি refresh-এ update)।
- প্রতি disconnect-এ counter 0 থেকে শুরু হবে (PPPoE session-এর স্বাভাবিক behavior, যেটাই user চাচ্ছেন)।
- MB/GB তে format হবে already (`formatBytes` helper)।

Zero database change, zero new dependency।

