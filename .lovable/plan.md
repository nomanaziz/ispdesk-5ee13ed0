## লক্ষ্য

OLT Inspector-এ দুটো আলাদা scenario support করব, এবং সাথে OLT-এর basic system info (interface count, EPON/GPON/SFP breakdown, up/down) দেখাব।

## দুটো Scenario (User toggle করতে পারবে)

**Scenario 1 — "ইউজার সহ" (with-user view)**
ONU MAC / SN → MikroTik PPPoE caller-id MAC মিলিয়ে customer name দেখাবে। যদি match না হয়, customer column ফাঁকা থাকবে কিন্তু ONU row লুকাবে না।

**Scenario 2 — "শুধু OLT" (without-user view)**
শুধু OLT-এর নিজের data: ONU description (যেটা OLT-তে লেখা আছে), MAC/SN, PON port, Rx power, status। MikroTik / user_onu_mapping একদম touch করবে না — এটাই OLT-only natural view।

UI-তে ONU tab-এর উপরে একটা small SegmentedControl / toggle:  
`[ শুধু OLT ]  [ + ইউজার ]` — default = "শুধু OLT" (কারণ এটাই OLT-এর native truth)।

## কী কী add করব

### 1. নতুন resource: `system` (OLT chassis snapshot)

`inspect-device` → `inspectOlt('system')` return করবে:

```
{
  total_interfaces, epon_count, gpon_count, sfp_count, uplink_count,
  ports_up, ports_down,
  brand_model, hardware_version, firmware_version,
  uptime, agent_last_seen, snmp_last_seen
}
```

Source:
- `olt_devices` row (brand_model, hw, fw, uptime, last_seen)
- `olt_ports` aggregate (port_type → epon/gpon/sfp/uplink count; oper_status → up/down count)

UI: নতুন প্রথম tab "📊 Overview" — chip grid + summary। এটাই OLT খোলার পরে default tab হবে।

### 2. `users` resource → mode parameter

`inspectOlt(deviceId, 'users', { mode: 'olt-only' | 'with-user' })`

- `olt-only` (default): শুধু `onu_list` থেকে — name = description ?? mac
- `with-user`: এখনকার মতো `user_onu_mapping` + MikroTik PPPoE MAC join

UI toggle দুটো query key আলাদা রাখবে।

### 3. `interfaces` enrich

`olt_ports` থেকে port_type ভিত্তিক grouping এবং oper_status সহ row। Inspector PON tab-এ আগের column-এর পাশে নতুন column: `oper_status` (up/down badge), `admin_status`।

EPON/GPON detection: port_name pattern (`EPON0/x`, `GPON0/x`, `gigabit`, `tenGigE`) থেকে infer করব যদি `port_type` খালি থাকে।

### 4. Agent contract update (doc only)

`AGENT_CONTRACT.md`-এ যোগ করব — agent কে এই OID গুলোও walk করতে হবে এবং `pon_ports[]`-এ পাঠাতে:
- `ifType` (1.3.6.1.2.1.2.2.1.3) → EPON / GPON / Ethernet / SFP detect
- `ifOperStatus`, `ifAdminStatus`, `ifSpeed`
- BDCOM EPON ONU description OID যাতে scenario-2 কাজ করে

### 5. UI changes — `DeviceInspectorDialog.tsx`

- নতুন `Overview` tab (OLT হলে)
- ONU tab-এর উপরে `Tabs`-style toggle: শুধু OLT / + ইউজার
- PON tab-এ oper_status column + EPON/GPON/SFP filter chips
- Header chip-এ অতিরিক্ত: `EPON: X  GPON: Y  SFP: Z  Up: A/B`

## ফাইল পরিবর্তন

- `supabase/functions/inspect-device/index.ts` — system resource + mode-aware users
- `supabase/functions/ingest-snmp-data/AGENT_CONTRACT.md` — নতুন OID add
- `src/components/device-admin/DeviceInspectorDialog.tsx` — Overview tab, scenario toggle, extra columns

DB schema change লাগবে না — `olt_ports.oper_status/admin_status/port_type` already আছে; `olt_devices`-এ hardware/firmware/uptime column-ও already আছে।

## যা এই plan-এ নেই (পরে)

- VLAN OID walk (BDCOM-specific, পরের iteration)
- Per-ONU enable/disable action
- ONU realtime traffic graph

## টেস্ট প্ল্যান

1. Deploy → Inspector → AFTABNOGOR_OLT
2. Overview tab-এ চিপ দেখা যাবে (data 0 হলেও structure দেখাবে)
3. ONU tab → "শুধু OLT" mode-এ description-ভিত্তিক list
4. Toggle → "+ ইউজার" mode-এ MikroTik mapping যোগ হবে
5. PON tab-এ port-type ও up/down breakdown
6. Naeem-PC agent updated contract অনুযায়ী data পাঠালে সব populate হবে
