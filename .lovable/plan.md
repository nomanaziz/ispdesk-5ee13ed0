# OID Library + Device Inventory SNMP Fix

দুটো আলাদা কিন্তু সম্পর্কিত কাজ:

## 1. Device Inventory dialog ফিক্স (`AddDeviceDialog.tsx`)

বর্তমান সমস্যা: `device-admin/devices`-এ "নতুন ডিভাইস যোগ" form-এ protocol radio শুধু **SSH / Telnet** — SNMP option নাই, SNMP community / version / SNMP port আলাদা করে নেওয়ার কোনো ফিল্ড নাই।

পরিবর্তন:

- **Protocol selector**-এ তৃতীয় option যোগ: `SNMP` (এবং চাইলে `SNMP + SSH fallback`, `SNMP + Telnet fallback`)। RadioGroup → Select-এ রূপান্তর কারণ ৪টা হয়ে যাচ্ছে।
- নতুন collapsible section **"SNMP কনফিগ"** — protocol-এ SNMP/fallback সিলেক্ট হলে দেখাবে:
  - SNMP IP (ফাঁকা রাখলে main IP)
  - SNMP Port (default 161)
  - Community string (default `public`)
  - Version: v1 / v2c / v3
  - Vendor OID Profile dropdown (নিচের লাইব্রেরি থেকে আসবে)
- নতুন collapsible section **"Agent (optional)"**:
  - Use polling agent (toggle)
  - Agent priority: `snmp_first` / `agent_first` / `snmp_only` / `agent_only`
  - Agent stale seconds (default 180)
- Vendor list বাড়ানো — শুধু `cisco/juniper/huawei/bdcom/cdata/generic` না, পুরো লিস্ট: `vsol, bdcom, dbc, syrotech, solitine, corelink, c-data, ecom, lightx, hsgq, phyhome, tbs, huawei, hbdpon, mikrotik, zte, cisco, juniper, generic`।
- Mutation update: নতুন কলাম গুলোয় insert করবে (নিচের migration-এ যোগ হবে)।

## 2. OID Library (নতুন feature)

কোথায় add হবে: নতুন পেজ `/dashboard/device-admin/oid-library` (sidebar-এ "OID Library" menu)। এখান থেকে admin OID profile manage করবে এবং device form-এ সেটা select করবে।

### Database (migration)

নতুন দুটো table:

**`device_vendor_profiles`** — প্রতি vendor-এর একটা profile (system seed + custom):
- `vendor_key` (text, unique) — e.g. `vsol`, `bdcom_olt`, `mikrotik_router`
- `display_name`, `device_category` (olt / router / switch / onu)
- `is_system` (bool — seeded profile edit করা যাবে না, শুধু clone)
- `notes`

**`device_oid_mappings`** — profile-এর ভেতরের OID গুলো:
- `profile_id` (FK)
- `metric_key` (text) — standard set: `system_name`, `system_uptime`, `cpu_usage`, `memory_usage`, `temperature`, `onu_rx_power`, `onu_tx_power`, `onu_status`, `onu_distance`, `onu_serial`, `onu_mac`, `port_admin_status`, `port_oper_status`, `mac_fdb`, `interface_in_octets`, `interface_out_octets` ইত্যাদি
- `oid` (text) — e.g. `1.3.6.1.2.1.1.5.0`
- `oid_type` (`scalar` | `walk` | `table`)
- `value_transform` (text, nullable) — e.g. `divide:10`, `dbm_signed`, `hex_to_mac`
- `description`

**`device_admin_managed_devices`-এ যোগ:**
- `snmp_enabled` (bool default false)
- `snmp_ip`, `snmp_port` (default 161), `snmp_community` (default 'public'), `snmp_version` (v1/v2c/v3)
- `oid_profile_id` (FK → device_vendor_profiles, nullable)
- `agent_enabled` (bool default false), `data_source_priority` (text, same enum হিসেবে), `agent_stale_seconds` (int default 180)
- `fallback_protocol` (text — `ssh` / `telnet` / null)

RLS: tenant scoped same pattern হিসেবে। `is_system=true` profile সবাই দেখতে পাবে কিন্তু edit/delete করতে পারবে না।

### Seed data (system profiles)

মাইগ্রেশনে প্রতিটি vendor-এর জন্য baseline OID seeded:

| Vendor | Notes |
|---|---|
| VSOL OLT | EPON/GPON standard + VSOL private MIB |
| BDCOM OLT | BDCOM private MIB (.1.3.6.1.4.1.3320) |
| DBC OLT | C-Data based |
| Syrotech | EPON standard + Syrotech ext |
| Solitine | Generic GPON |
| CORELINK | C-Data clone |
| C-Data OLT | .1.3.6.1.4.1.17409 |
| ECOM | Generic |
| LightX | Generic GPON |
| HSGQ | Generic EPON |
| Phyhome | Phyhome private MIB |
| TBS | Generic |
| Huawei OLT | .1.3.6.1.4.1.2011 (MA5600 series) |
| HBDPON | Generic |
| MikroTik Router/Switch | MikroTik MIB .1.3.6.1.4.1.14988 |

প্রতিটি profile-এ minimum: `system_name`, `system_uptime`, `cpu_usage`, `memory_usage`, এবং OLT হলে ONU-related OID set।  
নোট: real-world MIB values পরবর্তীতে user নিজে adjust/override করতে পারবে।

### UI — OID Library page

বাম দিকে vendor profile list (search সহ), ডান দিকে selected profile-এর OID টেবিল (metric_key, OID, type, transform, description)। Actions:
- "নতুন Profile" — blank বা existing থেকে clone
- "Edit" row inline বা dialog-এ
- "Import JSON" / "Export JSON" — পরে portable
- System profile-এ "Clone to custom" বাটন (edit ব্লকড)

### Device form integration

`AddDeviceDialog` ও `OltDevices.tsx`-এর form-এ "OID Profile" dropdown — vendor select হলে auto-suggest matching system profile, কিন্তু user override করতে পারবে।

## 3. Sync logic এ OID profile ব্যবহার

`sync-olt-data` ইতোমধ্যে source priority enforce করে। নতুন helper edge function **`snmp-poll-device`** যেটা:
1. device load করবে (OID profile সহ)
2. profile-এর OID গুলো walk/get করবে
3. fail হলে — যদি `fallback_protocol` সেট থাকে — SSH/Telnet adapter call করবে
4. result কে normalized payload-এ `sync-olt-data`-তে post করবে (`source: 'snmp'` বা `'ssh'`)

এই edge function এই plan-এ scaffold হবে (skeleton + OID profile loader + fallback dispatch), কিন্তু প্রতিটি vendor-এর actual SNMP walk implementation iterative — প্রথম pass-এ generic SNMP walker + Huawei/BDCOM/VSOL/MikroTik live; বাকি গুলো profile load করবে কিন্তু parser placeholder থাকবে।

## ফাইল পরিবর্তন (overview)

- **Migration** (নতুন):
  - `device_vendor_profiles`, `device_oid_mappings` (+ RLS + seed)
  - `device_admin_managed_devices` ALTER (SNMP/agent columns)
- **নতুন pages**:
  - `src/pages/dashboard/device-admin/OidLibrary.tsx`
  - `src/components/device-admin/OidProfileDialog.tsx`
- **এডিট**:
  - `src/components/device-admin/AddDeviceDialog.tsx` — protocol Select + SNMP/Agent section + OID profile picker + expanded vendor list
  - Device-admin sidebar / route registry — OID Library link
  - `src/App.tsx` — route যোগ
- **নতুন edge function** (skeleton): `supabase/functions/snmp-poll-device/index.ts`

## টেকনিক্যাল নোট

- OID-এর actual SNMP walk Deno edge থেকে UDP — limited; production-এ on-prem agent recommended (ইতিমধ্যে decided)। তাই `snmp-poll-device` agent + edge উভয় mode সাপোর্ট করবে: agent push (existing pattern) অথবা edge-initiated walk (best-effort)।
- `oid_profile_id` device update form-এও দেখাবে (`OltDevices.tsx` form-এও একই picker)।
- RLS: `device_vendor_profiles` system rows — `is_system=true` select সবার জন্য, write blocked।

বাকি কাজ (agent installer, per-vendor parser polish) পরবর্তী iteration-এ।
