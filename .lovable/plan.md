## কেন এখন interface/hardware/serial/MAC আসছে না — সরল উত্তর

আমি যা পেয়েছি database-এ:
- `olt_devices`: brand_model আছে (BDCOM GP3600-08B), uptime raw সংখ্যা আছে (TimeTicks), কিন্তু `hardware_version`, `firmware_version`, `serial_number`, `mac_address` সব `NULL`
- `olt_ports`: **পুরো ফাঁকা** — তাই Total Interface=0, EPON=0, GPON=0, Up/Down=0/0
- agent (Naeem-PC) install হয়নি (`agent_last_seen=null`)

**কারণ:** এই codebase-এ এখন পর্যন্ত শুধু `snmp-fetch-olt-name` function-টা সত্যিকারের SNMP UDP করে — সে শুধু sysDescr এনেছে। কোনো function এখন `ifTable` walk করে না, তাই port list তৈরি হয়নি। এবং brand_model থেকে hardware/firmware parse করা হয়নি — raw string-টাই দেখানো হচ্ছে।

**ভালো খবর:** Supabase Edge runtime `Deno.listenDatagram` দিয়ে UDP/SNMP করতে পারে (already proven — brand_model এসেছে)। মানে OLT এর public IP/port reachable, **agent install না করেও** আমি এই কাজগুলো cloud থেকে করতে পারব।

## তোমার কাছে আমার যা লাগবে (অল্প)

1. **Confirm:** OLT-এর management IP কি Supabase cloud থেকে reach করা যায়? (sysDescr এসেছে মানে হ্যাঁ — শুধু confirm করে দিও, port 161 firewall-এ open আছে কিনা)
2. **আর কিছু লাগবে না** — community string (`GxNsnMP_RO`) ও SNMP version (v2c) ইতিমধ্যে DB-তে সেভ আছে।

VSol/Huawei/ZTE OLT যোগ করলে তখন আলাদা OID profile দরকার হবে — এখন BDCOM-এর জন্য কাজ করব।

## কী কী fix/add করব

### 1. নতুন edge function: `snmp-walk-olt-system`
SNMP দিয়ে fetch করবে:
- `sysDescr` → brand_model + firmware parse ("Version 117819" → firmware_version="117819")
- `sysDescr` থেকে hardware_version parse ("hardware version: A" → "A")
- `sysUpTime` (TimeTicks) → human format ("11 days 19 hr 38 min")
- `ifPhysAddress` first non-zero → mac_address
- `entPhysicalSerialNum` (1.3.6.1.2.1.47.1.1.1.1.11) → serial_number

DB update: hardware_version, firmware_version, serial_number, mac_address, uptime (formatted), snmp_last_seen।

### 2. নতুন edge function: `snmp-walk-olt-interfaces`
ifTable walk করে olt_ports populate করবে:
- `ifDescr` (1.3.6.1.2.1.2.2.1.2) → port_name
- `ifType` (1.3.6.1.2.1.2.2.1.3) → port_type detect
- `ifAdminStatus` (.7), `ifOperStatus` (.8)
- `ifSpeed` (.5) → speed_mbps

**Port classification (user-defined, only 3 types):**
- `pon` — port_name match EPON/GPON pattern (vendor-specific)
- `ether-sfp` — ifType=117 (gigabitEthernet over SFP) বা ifSpeed≥1000 যেগুলো PON না
- `ether-rj45` — ifType=6 (ethernetCsmacd) baseline copper
- (Uplink/Other category একদম drop)

### 3. `snmp-poll-device` upgrade
এখন শুধু TCP probe → পরিবর্তে call করবে: `snmp-walk-olt-system` + `snmp-walk-olt-interfaces` parallel। Cron (every 2 min)-ও তাই করবে।

### 4. `inspect-device` (OLT branch) update
- **Uptime format:** TimeTicks/100 → "Xd Yh Zm" string
- **brand_model split:** model+firmware+hw আলাদা field-এ দেখাবে
- **System resource counts:** শুধু relevant categories return করব (`pon_count`, `ether_sfp_count`, `ether_rj45_count`) — uplink/other সরিয়ে দিচ্ছি
- **pon_type aware:** `pon_type='gpon'` হলে "GPON" chip দেখাবে, EPON chip hide; `epon` হলে উল্টো

### 5. `DeviceInspectorDialog` UI tweak (Overview tab)
- চারটে chip: **Total Interface | Up/Down | Total ONU | Online ONU**
- পরের row: **PON (label= GPON/EPON pon_type অনুযায়ী) | Ether-SFP | Ether-RJ45** — Uplink/Other সম্পূর্ণ বাদ
- System info card: Hardware/Firmware/Serial/MAC/Uptime এখন real value দেখাবে
- "এখনই Poll" button দুটো walk function একসাথে fire করবে, 5s পরে refetch

## ফাইল পরিবর্তন

- `supabase/functions/snmp-walk-olt-system/index.ts` — নতুন (SNMP system OID walk)
- `supabase/functions/snmp-walk-olt-interfaces/index.ts` — নতুন (ifTable walk → olt_ports upsert)
- `supabase/functions/snmp-poll-device/index.ts` — TCP probe + auto-trigger দুটো walk
- `supabase/functions/inspect-device/index.ts` — system resource কাটছাঁট + uptime formatter + brand parse
- `src/components/device-admin/DeviceInspectorDialog.tsx` — chip layout (Uplink/Other বাদ, PON label dynamic)

DB schema change লাগবে না।

## যা এই plan-এ নেই

- Huawei/ZTE/VSol OID profile (পরে — তখন আরেক round)
- VLAN OID walk
- Agent install (cloud SNMP কাজ করছে, এখন দরকার নেই)

## টেস্ট প্ল্যান

1. Deploy → Inspector → AFTABNOGOR_OLT → "এখনই Poll"
2. ~5 sec পরে Overview-এ:
   - Total Interface > 0
   - PON / Ether-SFP / Ether-RJ45 count আসবে
   - Up/Down সঠিক
   - Hardware="A", Firmware="117819", MAC, Serial সব populate
   - Uptime: "11 days 19 hr 38 min"
3. PON tab-এ port list, প্রতিটার oper/admin status
