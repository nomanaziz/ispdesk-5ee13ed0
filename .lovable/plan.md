

## MikroTik PPPoE Live Traffic — Real Fix

### সমস্যা (কেন এখনো কাজ করে না)

`collect-client-traffic` ব্যবহার করছে `/ppp/active/print` থেকে `bytes-in`/`bytes-out`। কিন্তু RouterOS-এ **`/ppp/active/print` সাধারণত byte counter return করে না** — এটা শুধু session metadata (name, address, uptime, caller-id) দেয়। ফলে delta সবসময় 0, `total_upload`/`total_download` update হয় না, graph flat থাকে।

**সঠিক উপায় (যেভাবে existing portals করে):**
PPPoE user যখন connect করে, MikroTik একটা dynamic interface বানায় — name pattern: `<pppoe-username>` বা `<service>-<username>`। সেই interface-এর byte counter (`rx-byte`, `tx-byte`) থেকে real traffic পাওয়া যায় `/interface/print stats`-এর মাধ্যমে। এটা সবসময় accurate এবং historic-cumulative।

### Approach

**Edge function `collect-client-traffic` রিরাইট:**

1. প্রতি device-এ login → `/ppp/active/print` (session list + interface name)
2. একই connection-এ `/interface/print stats` চালাই (এক shot এ সব interface byte counter)
3. Active session-এর `name` (username) ↔ interface match (কারণ MikroTik-এ PPPoE interface name = `<service-name>-<username>`, যেমন `<pppoe-rashed>`)
4. Each active user-এর জন্য:
   - `rx-byte` → client-এর download (server থেকে user-এ যাওয়া = user-এর download)
   - `tx-byte` → client-এর upload
   - **Note:** Interface counter MikroTik-এর perspective থেকে: `rx` = MikroTik-এ ঢুকছে = user upload, `tx` = MikroTik থেকে বের হচ্ছে = user download। আমরা এটা সঠিকভাবে map করব।
5. এই **cumulative bytes** সরাসরি `clients.total_upload` / `total_download`-এ লিখব (delta calc নয় — interface counter session start থেকে absolute, সেটা client row-এ overwrite হবে যাতে frontend delta calc করতে পারে)
6. `client_traffic_logs`-এ snapshot insert (history-র জন্য)

### Frontend (`PortalLiveUsage.tsx`) — already polls every 3s

Frontend ঠিক আছে — সে delta calculate করে। কিন্তু কাজ করছে না কারণ DB তে value change হচ্ছে না। Edge function fix করলে frontend আপনাআপনি কাজ করবে।

**আরো নিশ্চিত করার জন্য:** frontend-এ poll interval edge function trigger করব (যাতে user portal খোলা থাকলে real-time fresh data আসে) — `supabase.functions.invoke('collect-client-traffic')` ছাড়াই, একটা new lighter function `live-traffic-snapshot` তৈরি করব যেটা শুধু একজন client-এর জন্য MikroTik query করে instantly response দেয় (no DB write, কম latency)।

### Files

| File | Change |
|------|--------|
| `supabase/functions/collect-client-traffic/index.ts` | Rewrite: use `/interface/print stats` + match active sessions by username → write cumulative bytes to `clients` |
| `supabase/functions/live-traffic-snapshot/index.ts` | NEW — single-client lightweight endpoint: `{client_id}` → returns `{rx_bps, tx_bps, total_rx, total_tx}` instantly using `/interface/monitor-traffic` (1-sec sample) |
| `supabase/config.toml` | Register new function (verify_jwt=false) |
| `src/pages/portal/PortalLiveUsage.tsx` | Switch from DB-polling to `live-traffic-snapshot` invocation every 3s for instant Kbps; keep DB read for cumulative totals |
| Migration | Set up pg_cron to run `collect-client-traffic` every 60s (if not already scheduled) — for background cumulative tracking |

### How `live-traffic-snapshot` will work

```
Input: { client_id }
1. Look up client → get username + mikrotik_id
2. Connect to MikroTik
3. Run /ppp/active/print where name=<username> → get interface name (e.g. <pppoe-rashed>)
4. Run /interface/monitor-traffic interface=<ifname> once=yes
   → returns rx-bits-per-second, tx-bits-per-second instantly
5. Run /interface/print stats where name=<ifname>
   → returns rx-byte, tx-byte (cumulative for this session)
6. Return JSON: { 
     online: true,
     interface,
     rx_bps, tx_bps,        // live speed
     session_rx, session_tx, // current session bytes
     uptime
   }
```

### কেন এটা কাজ করবে (existing portal-এর মতো)

`monitor-traffic once=yes` MikroTik-এর native realtime API — এটাই MikroTik Winbox-এ Torch/Traffic graph চালায়। 1 second sample নিয়ে exact bps return করে। কোনো delta calc লাগে না, MikroTik নিজেই calculate করে দেয়।

### Phasing

- **Phase 1 (এখন):** নতুন `live-traffic-snapshot` function + frontend switch + cumulative collector ফিক্স
- **Phase 2 (পরে):** Admin-side same view (Online Client Monitoring → click row → detail page); per-second WebSocket streaming (যদি দরকার হয়)

