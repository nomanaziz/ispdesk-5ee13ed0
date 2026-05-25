## Goal

`AddDeviceDialog`-কে সিম্পল করা হবে — Category-based dynamic form, যেখানে field গুলো শুধু দরকার মত show করবে। Monitoring-focused, configuration না।

## নতুন Form Structure

**সবসময় দেখাবে (top):**
- Device Name *
- Device Category * (Router / OLT / Switch / Access Point / Server / PPPoE Server)
- IP Address *
- Location (optional)

বাকি সব field category অনুযায়ী dynamic।

## Category-wise Logic

### Router
- Vendor (MikroTik / Cisco / Juniper / Huawei / Other)
- Connection Protocol: MikroTik API / SSH / Telnet / SNMP
- Protocol = **MikroTik API** → API port, username, password (other field hide)
- Protocol = **SSH/Telnet** → port, username, password, enable password (Cisco/Huawei হলে)
- Protocol = **SNMP** → SNMP section (নিচে)

### OLT
- OLT Vendor dropdown (VSOL, BDCOM, Huawei, C-DATA, HSGQ, Phyhome, TBS, HBDPON, ECOM, LightX, Syrotech, Solitine, CORELINK, DBC, Other) — future-extensible
- Communication Type:
  - **Type 1 — SNMP based** → SNMP section + OID Profile
  - **Type 2 — SSH/Telnet based** → SSH/Telnet fields + OID Profile (CLI parsing)
  - **Type 3 — SNMP + SSH/Telnet fallback** → both
- Reference: ছবিতে দেখানো VSOL_EPON_TYPE_2 / VSOL_GPON-এর মত vendor variant OID Profile select থেকে আসবে।

### Switch (monitoring-only)
- Vendor (optional dropdown)
- SNMP section (mandatory — port monitoring এর জন্য)
- Monitoring toggles:
  - Port status monitor
  - Port bandwidth monitor
  - Optical/uplink power alert (threshold dBm)
  - Online/offline check interval
- কোনো config/CLI field নয়।

### Access Point
- Vendor
- SNMP section (signal/client count monitoring)
- Online/offline check

### Server
- OS type (Linux / Windows / Other)
- SSH access (optional)
- SNMP section (CPU/RAM/Disk monitoring)

### PPPoE Server
- Vendor (MikroTik / Accel-PPP / Other)
- Protocol: MikroTik API / SSH / RADIUS
- Same field group হিসেবে Router-এর mirror, কিন্তু monitoring metric গুলো PPPoE-specific (active sessions ইত্যাদি)।

## Shared Sections (reusable, only when relevant)

**SNMP Block** (collapsible card):
- SNMP IP (blank = main IP)
- Port (default 161)
- Community
- Version (v1/v2c/v3)
- OID Profile picker (vendor অনুযায়ী auto-filter)

**Polling Agent** (optional toggle, all categories):
- Data source priority
- Stale seconds

**Alert thresholds** (Switch/OLT/AP/Server):
- Power min/max dBm
- Bandwidth %
- Offline grace minutes

## Data Model (no schema change)

বর্তমান `device_admin_managed_devices` table-এর existing column গুলোই ব্যবহার হবে:
- `category` — Router/OLT/Switch/AP/Server/PPPoE
- `vendor` — sub-vendor dropdown থেকে
- `protocol` — category অনুযায়ী allowed list filter
- SNMP, agent, fallback column গুলো আগেই আছে

নতুন কিছু লাগলে শুধু একটা JSON `monitoring_config` column add করা হবে alert threshold/monitor toggle store করতে — আলাদা migration হিসেবে আপনি approve করলে।

## Files to Change

- `src/components/device-admin/AddDeviceDialog.tsx` — পুরোটা refactor:
  - Top-level Category select বাকি form drive করবে
  - Subcomponent ভাগ: `<RouterFields>`, `<OltFields>`, `<SwitchFields>`, `<AccessPointFields>`, `<ServerFields>`, `<PppoeFields>`
  - Shared: `<SnmpBlock>`, `<CliBlock>`, `<AgentBlock>`, `<AlertThresholdsBlock>`
  - Form state structure flat রাখব, কিন্তু render conditional
- Vendor list গুলো একটা const map-এ — future-এ vendor add করা সহজ
- Category list-ও const — নতুন category যোগ করতে একটা entry + একটা subcomponent

## UX

- Dialog max-width same, কিন্তু field কমে যাওয়ায় height অনেক কম হবে
- Section header ছোট, separator ব্যবহার
- "Advanced" (Agent, thresholds) collapsed by default

## Out of Scope

- Database schema change (existing column reuse)
- Configuration/CLI command UI — আলাদা tool-এ যাবে
- Polling logic edit — শুধু form UI

## Confirmation দরকার

1. উপরের 6টা category list ঠিক আছে, না আরও কিছু (e.g., CCTV/NVR, UPS) add করব?
2. `monitoring_config` JSON column add করার permission দিবেন alert threshold store করতে? না দিলে threshold field গুলো আপাতত UI-তে থাকবে কিন্তু save হবে না।
