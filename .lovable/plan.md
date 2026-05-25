
## সমস্যা কী

`/dashboard/olt`-এ Sync button click করলেও BDCOM-এর status `unknown` থেকে যায় কারণ:

- Sync button `snmp-poll-device` edge function call করে, কিন্তু ওইটা শুধু **OID plan return করে** — actual SNMP request পাঠায় না, status update-ও করে না।
- `snmp-fetch-olt-name`-এ আসল UDP SNMP code আছে (sysName fetch), কিন্তু সেটা শুধু "Add device" dialog-এ নাম auto-fill করতে ব্যবহার হয়।
- BDCOM-এর OID profile-এ `onu_status / onu_serial / onu_distance` সব placeholder OID (`1.3.6.1.4.1.0.0.0.0`) — EPON বা GPON কোনোটারই সত্যিকারের OID নাই।
- কোথাও PON type (EPON / GPON) select করার option নাই, তাই system জানে না কোন MIB walk করবে।

## কী বানাবো

### 1. Schema: PON type field যোগ

`olt_devices` এবং `device_admin_managed_devices` দুটিতেই new column `pon_type text` (`epon` / `gpon` / `mixed`)। Default `mixed`। DB trigger update করে দিব যাতে managed→olt mirror-এ এটাও copy হয়।

### 2. Vendor + PON type অনুযায়ী OID profile seed

Vendor catalog এ এই combination-গুলো প্রি-সিড করব এবং `device_oid_mappings`-এ আসল OID বসাবো (research করে web থেকে confirm করে):

| Vendor | PON Type | Profile |
|---|---|---|
| BDCOM | EPON | `bdcom-epon` — `1.3.6.1.4.1.3320.101.10.*` (onu MAC, status, RX power, distance) |
| BDCOM | GPON | `bdcom-gpon` — `1.3.6.1.4.1.3320.101.11.*` / GPON MIB |
| Vsol | EPON / GPON | আলাদা |
| DBC, Corelink ইত্যাদি | EPON / GPON | আলাদা |
| Huawei, ZTE, Nokia | mixed (chassis) | existing generic |

Migration-এ BDCOM EPON ও BDCOM GPON profile fully seed করব — current BDCOM device-কে GPON profile-এ remap করব।

### 3. Sync button আসলে SNMP চালাবে

`snmp-poll-device` edge function rewrite:

1. Device load → target IP/port/community নাও।
2. **sysName GET (1.3.6.1.2.1.1.5.0)** UDP দিয়ে চালাও (`snmp-fetch-olt-name`-এর encoder/decoder reuse — শেয়ার করার জন্য `_shared/snmp.ts` বানাবো)।
3. Response এলে → `olt_devices` update: `status='online'`, `last_seen=now()`, `snmp_last_seen=now()`, `last_data_source='snmp'`। Timeout হলে → `status='offline'`, `last_offline_reason='SNMP timeout'`।
4. (Optional এই step-এ) sysUpTime, sysDescr scalar GET — `uptime`, `brand_model` update।
5. ONU walk (status/serial/rx_power) — agent-এর জন্য রেখে দেব; এই step-এ শুধু status reachability fix করব যাতে dashboard correctly online/offline দেখায়।

Response `{ok, status, name, uptime}` return করবে। Frontend toast-এ status দেখাবে।

### 4. UI: Add/Edit OLT dialog-এ PON type selector

`OltDevices.tsx` add dialog (এবং device-admin `AddDeviceDialog` যখন category=olt) — `vendor` change হলে:

- BDCOM / Vsol / DBC / Corelink ইত্যাদি single-type vendor → **required EPON / GPON radio** দেখাবে।
- Huawei / ZTE / Nokia → field hide (auto `mixed`)।

Save করার সময় `pon_type` সাথে যাবে। `oid_profile_id` server-side auto-resolve হবে vendor+pon_type অনুযায়ী (অথবা client-এ profile dropdown filter)।

### 5. Existing BDCOM device fix

User-এর existing BDCOM (id `c6a38ddd...`) — migration-এ `pon_type='gpon'` set করব এবং BDCOM-GPON profile-এ point করব। Sync চাপলেই status `online` হওয়া উচিত (যদি 103.147.107.1:173 আসলে reachable হয় এবং community `GxNsnMP_RO` valid হয়)।

## Files touched

- `supabase/migrations/...` — new column `pon_type`, mirror trigger update, BDCOM EPON+GPON OID seed, existing BDCOM remap
- `supabase/functions/_shared/snmp.ts` (new) — SNMP encode/decode util
- `supabase/functions/snmp-poll-device/index.ts` — real probe + status update
- `supabase/functions/snmp-fetch-olt-name/index.ts` — import shared util
- `src/pages/dashboard/olt/OltDevices.tsx` — PON type field in add/edit dialog
- `src/components/device-admin/AddDeviceDialog.tsx` — PON type when category=olt

## এই plan-এ যেটা **নাই**

- ONU-level walk (rx_power, serial, distance) production-grade implementation — Sync button আপাতত শুধু **device reachability + status** confirm করবে। পরবর্তীতে আলাদা ticket-এ ONU walk যোগ হবে।
- অন্যান্য vendor (Vsol, DBC, Corelink) এর GPON/EPON profile actually seed — শুধু BDCOM-এর GPON+EPON এই round-এ। বাকিগুলোর জন্য structure ready থাকবে।

Approve করলে BDCOM-এর জন্য আগে fix দিব, status আসা উচিত।
