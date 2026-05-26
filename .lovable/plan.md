## লক্ষ্য

Device Inspector → AFTABNOGOR_OLT খুললে এখন সব tab ফাঁকা। MikroTik-এর মতো এখানেও দেখাতে হবে:

- কোন PON port-এ কয়টা ONU আছে, কয়টা active
- প্রত্যেক ONU-এর MAC, signal (Rx/Tx), status, description
- কোন ONU-তে কোন user (PPPoE/Static) bound — অর্থাৎ user↔ONU map
- VLAN / VLAN-IP — best-effort note (BDCOM EPON VLAN OID আলাদা, পরে আনব)

## বর্তমান অবস্থা যা পেয়েছি

- OLT: BDCOM GP3600-08B, vendor=bdcom, agent (Naeem-PC) assign করা
- `snmp-poll-device` cron প্রতি 2 min reachability check করে — TCP only
- `snmp-fetch-olt-name` থেকে sysDescr (brand_model) এসেছে
- Agent heartbeat আসছে কিন্তু এখনো ONU/port snapshot পাঠাচ্ছে না
- `sync-olt-data` endpoint already `{onus[], olt_meta}` accept করে, কিন্তু `pon_ports[]` accept করে না
- `onu_list`, `olt_ports`, `olt_mac_table` — সব ফাঁকা
- Inspector tabs already wired to read এই tables থেকে; data নেই বলে blank

Edge runtime UDP করতে পারে না, তাই actual SNMP walk Naeem-PC agent-ই করবে। এই codebase-এ আমরা backend contract + UI ঠিক করব; agent-কে কোন OID walk করতে হবে সেটাও document করব।

## কী কী করব

### 1. Backend — `ingest-snmp-data` extend

Body-তে নতুন optional field যোগ:
- `pon_ports: [{ port_name, port_type:'pon', admin_status, oper_status, total_onus, online_onus, rx_power_dbm, description }]`
- `vlans: [{ vlan_id, name, tagged_ports[], untagged_ports[] }]` (পরের iteration-এর জন্য optional)

কাজ:
- `olt_ports`-এ upsert (key: olt_id+port_name)
- `olt_devices.total_onus`, `online_onus`, `last_seen` aggregate update
- ONU upsert এখন যেমন আছে তেমন থাকবে (interface field-এ PON port name)

### 2. Backend — `inspect-device` (OLT branch) আপডেট

`inspectOlt()`-এ নতুন resource:
- `users` → existing `onu_list` + LEFT JOIN `user_onu_mapping`/`ppp_users` যেন প্রতিটা ONU-এর সাথে customer name দেখা যায়
- `interfaces` → `olt_ports` থেকে port_name, port_type, total_onus/online_onus, rx_power, oper_status (port-wise active count এখানেই দেখাবে)
- `vlans` → ফাঁকা হলে clearer note: "BDCOM EPON VLAN — agent থেকে এখনো আসেনি"

### 3. UI — `DeviceInspectorDialog`

- OLT হলে tab labels একটু change:
  - "ইউজার" → "ONU (ইউজার)"
  - "ইন্টারফেস" → "PON পোর্ট"
- Columns adjust (rx_power, online_onus column যোগ)
- উপরে summary chip: "Total ONU: X / Online: Y" (olt_devices থেকে)
- "এখনই Poll করুন" button — `snmp-poll-device` কে `{device_id}` সহ call করবে; agent পরবর্তী cycle-এ full walk করে পাঠাবে

### 4. Agent contract doc (codebase-এ markdown)

`supabase/functions/ingest-snmp-data/AGENT_CONTRACT.md` — Naeem-PC agent-কে কী কী BDCOM EPON OID walk করতে হবে:

```text
ONU MAC table      : 1.3.6.1.4.1.3320.101.10.1.1.3
ONU description    : 1.3.6.1.4.1.3320.101.10.1.1.10
ONU online status  : 1.3.6.1.4.1.3320.101.108.1.1.2
ONU Rx power (dBm) : 1.3.6.1.4.1.3320.101.10.5.1.5
PON port stats     : 1.3.6.1.4.1.3320.10.3.1.x
ifDescr/operStatus : 1.3.6.1.2.1.2.2.1.2 / .8
```

Agent এই OID গুলো walk করে আগের contract অনুযায়ী `POST /ingest-snmp-data` পাঠাবে — body-তে `onus[]` + নতুন `pon_ports[]`।

### 5. User↔ONU mapping trigger

Inspector-এ "Users" tab খোলার সময় background-এ একবার `map-users-to-onu` invoke — যাতে নতুন ONU আসা মাত্র customer auto-attach হয়। (Throttle: last_run < 60s হলে skip)

## যা এই plan-এ নেই (পরে)

- BDCOM VLAN OID full coverage
- ONU realtime traffic graph
- Per-ONU enable/disable action

## ফাইল পরিবর্তন

- `supabase/functions/ingest-snmp-data/index.ts` — pon_ports accept
- `supabase/functions/ingest-snmp-data/AGENT_CONTRACT.md` — নতুন doc
- `supabase/functions/inspect-device/index.ts` — OLT branch enrich
- `src/components/device-admin/DeviceInspectorDialog.tsx` — OLT-specific tabs, columns, Poll Now button, summary chip

কোনো database schema change লাগছে না — সব table already আছে।

## টেস্ট প্ল্যান

1. Deploy → Inspector খুলে AFTABNOGOR_OLT সিলেক্ট
2. "এখনই Poll করুন" চাপি → agent next cycle-এ (≤ poll_interval) walk করে data পাঠাবে
3. ONU tab-এ list, PON tab-এ port-wise count আসবে
4. agent-side কাজ Naeem-PC team করবে AGENT_CONTRACT.md অনুযায়ী
