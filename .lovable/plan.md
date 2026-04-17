

User চান ৩টা specific change Online Client Monitoring table-এ:

### ১. Duration column → "Session Time" (combined cell, 2 lines)
এখন: শুধু `Duration` column যেখানে online হলে uptime দেখায়, offline হলে `—`।

নতুন:
- **Column heading rename**: `Duration` → `Session Time`
- **Cell content** (উপর-নিচ stack):
  - **Online**: উপরে badge `🟢 Online`, নিচে monospace `2h 14m` (uptime)
  - **Offline**: উপরে badge `⚫ Offline`, নিচে monospace `2h ago` বা `12 Apr 14:32` (last logout time)
- **Status column পুরোপুরি remove** (information এই cell-এ merge হয়ে গেল) → colSpan 20 → 19

### ২. Upload + Download → এক column "Traffic" (2-line stack)
এখন: 2টা আলাদা column (Upload, Download)।

নতুন: একটা column `Traffic`, প্রতিটা cell-এ:
```
↑ 12.3 MB     (blue, ArrowUpFromLine icon)
↓ 145.7 MB   (green, ArrowDownToLine icon)
```
এক session-এর data দেখাবে (current `total_upload`/`total_download` যা DB-তে আছে)।
**colSpan**: 19 → 18।

### ৩. Live traffic dialog → continuous update (every 2s)
এখন: dialog open করলে একবারই data fetch হয়, তারপর static।

নতুন: 
- `handleLiveTraffic` খোলার পর `setInterval(2000)` দিয়ে প্রতি 2s এ `live-traffic-snapshot` re-invoke করব।
- শুধু `live_traffic` (rx_bps/tx_bps) এবং `session.upload_bytes/download_bytes` field re-update হবে — monthly history fetch repeat হবে না (efficient)।
- Dialog close হলে interval clear।
- Dialog header-এ একটা ছোট pulsing indicator: "🔴 Live • Updates every 2s"।
- "Live Speed" cards-এ smooth animation/transition যাতে number change visible হয়।

### Files to edit
1. `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`:
   - Table header: remove `Status`, `Duration`, `Upload`, `Download` (4 columns) → add `Session Time`, `Traffic` (2 columns)
   - Table cell rendering update accordingly
   - colSpan 20 → 18
   - `handleLiveTraffic`: add polling interval ref; new helper `pollLiveSnapshot(client_id)` যা শুধু live data refresh করে
   - `useEffect` cleanup: dialog close-এ clear interval
   - Dialog header-এ live indicator add

### Notes
- "Last logout time" এর জন্য DB-তে কোনো `last_seen`/`last_logout_at` column নেই। **আপাতত** offline row-এ শুধু `Offline` badge দেখাব (relative time না দিয়ে)। 
- যদি future-এ accurate "last logout time" চান, তাহলে `clients.last_seen_at timestamptz` column add করতে হবে এবং `collect-client-traffic` cron job এর মধ্যে প্রতি sync-এ online clients-এর জন্য update করতে হবে। এটা চাইলে এই plan-এ যোগ করতে পারি।
- বর্তমান plan zero-database-change — শুধু UI restructure + polling।

