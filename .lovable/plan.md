## OLT/ONU Monitoring Module — সম্পূর্ণ ১৭-পয়েন্ট স্পেক

বিদ্যমান ভিত্তি: `olt_devices`, `olt_ports`, `onu_list`, `onu_history`, `olt_mac_table`, `user_onu_mapping`, `alerts` টেবিল এবং `OltDevices`, `OnuList`, `OnuDetail`, `PowerDashboard`, `FiberDownFinder` পেজ + `sync-olt-data`, `snmp-fetch-olt-name`, `snmp-fetch-olt-mac-table`, `map-users-to-onu` edge functions ইতিমধ্যেই আছে। নতুন করে শুরু না করে এগুলোকে শক্ত, সম্পূর্ণ এবং সংযুক্ত করব।

কাজ ৪টা পর্বে ভাগ করা হলো।

---

### পর্ব ১ — OLT Add + MikroTik Mapping (প্রথম ডেলিভারি)

`src/pages/dashboard/olt/OltDevices.tsx` উন্নয়ন:
- **ফর্ম রিফ্যাক্টর**: Basic / CLI Connection / SNMP / Mapping — ৪টা স্পষ্ট সেকশন।
- **MikroTik mapping জোরালো করা**: dropdown-এ MikroTik এর IP + host + status দেখাবে; নির্বাচিত হলে preview card (router name, host, connected users count)।
- **Brand options**: huawei / zte / bdcom আলাদাভাবে highlight (user-specified)।
- **SNMP Test বাটন**: `snmp-fetch-olt-name` কল করে name auto-fill (এটা আছে, UI improve করব)।
- **Validation (zod)**: IP format, port range, required fields।
- **List view**: প্রতি OLT row-এ — vendor badge, IP, MikroTik link, live status dot, ONU count (online/total), CPU/Mem, last seen।
- **Status badge**: online (সবুজ), offline (লাল), unknown (ধূসর) — `last_seen` থেকে গণনা।

DB migration:
- `olt_devices`-এ যা নেই যোগ: `last_offline_reason text`, `last_seen timestamptz` (যদি না থাকে check করে), index on `(branch_id, status)`।

---

### পর্ব ২ — ONU Monitoring + Power Threshold

`OnuList.tsx` rebuild হিসেবে **ONU card grid** (SmartOLT-style):
- Card-এ: PON port, ONU id, interface, online/offline badge, RX/TX power (color-coded), serial, MAC, model, last offline reason, last seen।
- **Color logic**:
  - সবুজ: RX −15 থেকে −25 dBm
  - হলুদ: RX −25 থেকে −28 dBm
  - লাল: RX < −28 dBm
- **ফিল্টার**: OLT, PON port, status, customer name/id, power range।
- **Linked customer**: `user_onu_mapping` join করে PPPoE username, package, IP, phone দেখাবে।
- ONU click → `OnuDetail` (already exists) — চার্ট সহ history।

`OnuDetail.tsx` enhance:
- Recharts দিয়ে RX/TX history line chart (24h / 7d / 30d toggle)।
- Status timeline (online/offline transitions)।

---

### পর্ব ৩ — Dashboard, Alerts, MikroTik User Mapping

**`PowerDashboard.tsx`** → full realtime overview:
- KPI cards: Total ONU, Online, Offline, Low Power (yellow), Critical (red), Total OLT।
- Per-PON statistics table (PON utilization %)।
- "Offline trend" chart (last 24h)।
- "Worst RX" top-10 list।
- Realtime: Supabase Realtime subscription on `onu_list` row updates (WebSocket-equivalent)।

**MikroTik User Mapping**:
- নতুন `OnuUserMapping.tsx` page — manual mapping UI (MAC / serial / username basis)।
- "Auto-map" বাটন → `map-users-to-onu` edge function কল।
- Mapping confidence badge (mac+port, mac_only_ambiguous, etc.)।

**Alerts**:
- Trigger: ONU offline → `alerts` insert; RX power < −28 → critical; sudden drop > 3dBm → warning। `sync-olt-data` ইতিমধ্যেই এই logic আংশিক করে — সম্পূর্ণ করব।
- Telegram channel: existing `send-telegram-alert` edge function-এ route করব।
- In-app: `AdminNotificationBell` ইতিমধ্যে আছে — `alerts` table থেকে subscribe।

---

### পর্ব ৪ — Agent Contract + Background Polling

ব্যবহারকারী on-prem agent চালাবেন। তাই backend = agent + edge functions।

**Edge function refresh / extension**:
- `sync-olt-data` (আছে) — agent POST করে ONU list/RX/TX। Documentation দেব।
- `snmp-fetch-olt-mac-table` (আছে) — MAC FDB push।
- নতুন: `agent-health-ping` — agent প্রতি ১ মিনিটে ping → `olt_devices.last_seen` update + status গণনা।

**Cron (pg_cron)**:
- প্রতি ৫ মিনিট: OLT `last_seen > 3min` হলে status = `offline` + alert।
- প্রতি ১ ঘণ্টা: `onu_history` থেকে ৩০ দিনের পুরোনো row archive/delete।

**Agent docs**: README-তে এক পাতা — কোন endpoint-এ কী POST করতে হবে, sample payload।

---

### Technical Details (developer-facing)

```text
DB migrations:
  - alter olt_devices: add last_offline_reason, ensure last_seen, index
  - alter alerts: ensure (severity, created_at) index
  - pg_cron: olt-offline-detector (*/5 * * * *)

Realtime:
  - supabase.channel('onu_list').on('postgres_changes', ...)
  - debounce 2s to avoid spam re-renders

Power color util in src/lib/oltPower.ts:
  rxColor(dbm) -> 'green'|'yellow'|'red'|'unknown'

Pages touched/created:
  - OltDevices.tsx (rebuild form + list)        [পর্ব ১]
  - OnuList.tsx (card grid)                     [পর্ব ২]
  - OnuDetail.tsx (charts)                      [পর্ব ২]
  - PowerDashboard.tsx (realtime KPI)           [পর্ব ৩]
  - OnuUserMapping.tsx (NEW)                    [পর্ব ৩]
  - lib/oltPower.ts (NEW util)                  [পর্ব ২]

Edge functions:
  - agent-health-ping (NEW)
  - sync-olt-data (extend alert logic)
  - send-telegram-alert (route ONU alerts)

Routes to add in App.tsx:
  - /dashboard/olt/user-mapping
```

স্কোপের বাইরে রাখা (পরে দরকার হলে): Three.js network map, advanced gesture UI, multi-OLT-to-multi-MikroTik junction (১:১ approved)।

---

### Delivery Order

1. **পর্ব ১** আগে শেষ করব এবং চালু অবস্থায় দেখাব — তারপরই পরের পর্বে যাব। প্রতি পর্বের শেষে আপনি verify করবেন।