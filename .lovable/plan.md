## আপনার OLT add করার প্ল্যান

বর্তমান অবস্থা DB তে check করলাম — `olt_devices` table এখন খালি (আপনি delete করে দিয়েছেন), এবং Naeem-PC agent online আছে (id: `48abcec1-...`)। নিচের কাজগুলো করব:

### ১. AFTABNAGAR-OLT সরাসরি insert করব (migration দিয়ে)

আপনার দেওয়া মান দিয়ে — port-গুলা সব সঠিক default-এ:

| Field | Value |
|---|---|
| name | AFTABNAGAR-OLT |
| vendor | bdcom |
| pon_type | gpon |
| ip_address | 192.168.110.4 |
| snmp_ip | 192.168.110.4 |
| **snmp_port** | **161** ✅ |
| snmp_community | GxNsnMP_RO |
| snmp_version | v2c |
| snmp_enabled | true |
| **telnet_port** | **23** ✅ |
| username | admin |
| password | greendhaka |
| brand_model | BDCOM GPON OLT |
| data_source_priority | agent_first |
| agent_enabled | true |
| **assigned_agent_id** | **Naeem-PC** (auto-assigned) ✅ |
| status | unknown (১ম poll-এর পর update হবে) |

### ২. Add Device Dialog-এ default-গুলা পাকাপোক্ত করব

যাতে next time আপনি শুধু IP, Name, Community দিলেই হয়:

- **SNMP Port**: input field-টা readonly/locked করে দেব `161`-এ (manual edit করতে গেলে warning) — যাতে আবার ভুল করে 162 না বসে যায়
- **Telnet port**: একই ভাবে 23-এ lock
- **SNMP version**: default `v2c` (already আছে)
- **Data source priority**: OLT category-তে default `agent_first` (এখন `snmp_first`)
- **Agent enabled**: OLT category-তে default `true`
- **Auto-assign agent**: শুধু একটাই online agent থাকলে save করার সময় automatic ভাবে সেটাই assign হয়ে যাবে — আপনাকে আলাদা করে Polling Agents পেজে গিয়ে assign করতে হবে না
- **OID Profile**: vendor=bdcom + pon=gpon select করলে auto-fill হবে "BDCOM OLT (GPON)" (auto-suggest logic আগে থেকেই আছে, শুধু gpon-specific profile-এ point করব)

### ৩. Verify

Migration approve করার ৩০-৬০ সেকেন্ড পর আমি check করব:
- agent heartbeat-এ এই OLT job হিসেবে আসছে কিনা
- `agent_last_seen`, `snmp_last_seen` update হয়েছে কিনা
- `total_onus` / `online_onus` populate হয়েছে কিনা

ঠিকঠাক হলে status `online` হয়ে যাবে এবং OltOverview-তে ONU list দেখবেন।

---

### Technical notes (ref only)

- Insert target: `public.olt_devices` (not `device_admin_managed_devices` — OltOverview ও heartbeat function এই table পড়ে)
- Agent id resolve: `(SELECT id FROM polling_agents WHERE name='Naeem-PC' LIMIT 1)`
- Dialog changes: `src/components/device-admin/AddDeviceDialog.tsx` — initial state-এ category-based defaults, single-agent auto-assign on save mutation
- Password plain text save হবে (encryption এখনো implemented না — পরে আলাদা task)

Approve করলে migration চালাবো, তারপর dialog edit করব, শেষে verify করে দিব।
