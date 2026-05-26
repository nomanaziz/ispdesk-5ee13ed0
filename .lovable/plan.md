# Plan: Online Client Monitoring (OLT-ভিত্তিক ONU live view)

## লক্ষ্য
আপনি যে screenshot পাঠিয়েছেন — সেই design follow করে একটা **Online Client Monitoring** page বানাব। উপরে ৩টা summary card (Total ONU / Online ONU / Matched PPPoE), নিচে একটা rich table — সব column সহ: OLT Name, PON Port, ONU#, PPPoE Username, ONU MAC, Router MAC, RX Power (color badge), TX Power, Voltage, Temp, Laser Bias, Status, Distance।

---

## ১. Page structure (load-safe)

আলাদা route রাখব যাতে অন্য page load না বাড়ে:

- **`/dashboard/olt/online-monitoring`** — All-OLT view (default: একটা OLT select করতে হবে, সব OLT একসাথে load হবে না → performance safe)
- প্রতিটা OLT card-এ একটা **"Live Monitoring"** button — click করলে এই page-এ চলে আসে, ওই OLT pre-selected হয়ে
- User-list থেকে কোনো user-এ click করলেও এই page-এ আসা যাবে, OLT + PON port + ONU pre-filtered হয়ে (`map-users-to-onu` data ব্যবহার করে)

Sidebar এ "OLT" group-এর under নতুন menu item যোগ হবে।

## ২. Data source — কোথা থেকে আসবে

Existing `onu_list` + `olt_devices` + `pppoe_user_onu_map` tables থেকে data render করব। এই table গুলো ইতিমধ্যে SNMP polling (edge function বা agent) update করে। কোনো নতুন table দরকার নেই।

Refresh strategy:
- Auto-refresh: **৩০ সেকেন্ড interval** (configurable, default off — manual refresh button)
- Page leave করলে refresh বন্ধ → load বাড়বে না

## ৩. Filtering (screenshot-এ যেটা নেই, সেটা যোগ হবে)

Table-এর উপরে filter bar:
- **OLT selector** (required)
- **PON Port** dropdown (ওই OLT-র সব port)
- **Status**: All / Online / Offline / LOS
- **RX Power range**: preset chips — `> -25 dBm`, `-25 to -27`, `-27 to -29`, `< -29 (Critical)`, `LOS (no signal)` + custom min/max
- **Search**: PPPoE username / ONU MAC / Router MAC
- **Export CSV** button

RX Power color rule (screenshot-এর সাথে মিল):
- Green badge: ≥ -24 dBm
- Yellow: -24 to -27
- Red: < -27 বা LOS

## ৪. SNMP-direct vs Agent — কেন agent লাগছে

আপনি জানতে চেয়েছেন SNMP direct কেন কাজ করছে না। সংক্ষেপে:

| পদ্ধতি | অবস্থা |
|---|---|
| Supabase Edge Function থেকে SNMP (UDP 161) | **কাজ করে না** — Deno edge runtime UDP socket support করে না, শুধু TCP/HTTP। তাই codebase-এ যে `snmp-poll-device` / `snmp-fetch-*` functions আছে সেগুলো cloud-এ run করলে timeout/connection error দেয়। |
| Browser থেকে SNMP | **সম্ভব না** — browser-এ raw UDP নেই |
| অন-প্রিমিস agent (Node.js, আপনার office PC) | **কাজ করে** — LAN থেকে OLT-এ direct SNMP, তারপর HTTPS-এ Supabase-এ push |

**সমাধান যা আপনি configure করতে পারেন (যদি SNMP-direct চান):**
1. একটা VPS/cloud server নিন যেটা OLT-এর public IP-তে UDP 161 reach করতে পারে (OLT public IP লাগবে + firewall rule)
2. ওই server-এ আমাদের agent চালান → এটাই effectively "SNMP-direct" হবে cloud থেকে
3. **অথবা** OLT-এর management IP-কে public করে port-forward করুন (security risk — recommend না)

বাস্তবে বেশিরভাগ ISP agent-ই use করে (Splynx, Smart OLT, UNMS সবাই)। তাই agent কে fallback না ভেবে **primary** ধরে এগোনই ভালো — device dependency কমাতে চাইলে agent একটা ছোট Raspberry Pi-তেও চলবে।

আপনি যদি এখন **agent test** করতে চান, monitoring page ready হলে আমি একটা test flow দেব।

## ৫. Per-user quick view

User list (PPPoE Users) থেকে কোনো user-এ একটা **"Live ONU Status"** button যোগ হবে — click করলে monitoring page-এ ওই user-এর row scroll/highlight হবে (auto-filter by username)।

## ৬. Performance safeguards

- OLT select না করা পর্যন্ত query চলবে না
- Pagination: ১০০ row/page (server-side via Supabase `.range()`)
- Auto-refresh default **off**, user toggle করবে
- Index check: `onu_list(olt_id, pon_port, status)` — দরকার হলে index migration যোগ হবে

---

## File changes (technical)

- `src/pages/dashboard/olt/OnlineMonitoring.tsx` — নতুন page
- `src/App.tsx` — route
- `src/components/AppSidebar.tsx` — menu item
- `src/pages/dashboard/olt/OltDevices.tsx` — "Live Monitoring" button প্রতিটা OLT row-এ
- `src/pages/dashboard/users/UsersList.tsx` (বা যা applicable) — user row-এ "Live ONU Status" link
- Index migration (যদি query slow হয়)

কোনো নতুন edge function বা table দরকার নেই — existing `onu_list` data-ই render হবে।

---

## নিশ্চিত করার বিষয়

এই plan approve করলে আমি build mode-এ এগোব। শুধু একটা confirm:
- **Default OLT selector** ঠিক আছে, নাকি "All OLTs aggregate" view-ও দরকার? (আমি default OLT-required রেখেছি load safety-র জন্য)