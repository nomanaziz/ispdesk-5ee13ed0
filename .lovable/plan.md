

## লক্ষ্য

3টা feature combine করে দেব, সব permission-gated:

1. **OLT Power Dashboard** (DB List) — power band অনুযায়ী ONU bucket grid + click → popup with details
2. **ONU Detail page** — single ONU's power graph, history, current stats
3. **Switch Management** — port on/off, description, VLAN add/del, SFP power, live traffic

---

## 1) Permission system (foundation, security-first)

নতুন permission keys (existing `has_role` + `olt_permissions` table extend করে):

| Permission key | বাংলা |
|---|---|
| `olt.dashboard.view` | OLT power dashboard দেখা |
| `olt.onu.view` | ONU details দেখা |
| `switch.view` | Switch list/info |
| `switch.port.toggle` | Port on/off |
| `switch.port.edit` | Description/VLAN edit |
| `switch.vlan.manage` | VLAN add/delete |
| `switch.traffic.view` | Live traffic monitor |

**DB:** নতুন table `device_permissions` (user_id, permission_key, scope: 'all'|'branch'|'device', scope_id) + helper function `has_device_permission(uid, key, device_id)` (SECURITY DEFINER).

**Frontend:** `usePermission(key, deviceId?)` hook + `<PermissionGate>` wrapper component যা button/page/action hide করবে।

**Backend:** প্রতিটা edge function (port toggle, vlan change, traffic query) entry-তে permission check — JWT validate → `has_device_permission` call → 403 যদি না থাকে।

---

## 2) OLT Power Dashboard (`/dashboard/olt/power-dashboard`)

Reference image-119 অনুযায়ী:

```text
┌─ DB List ───────────────────────────────────────────┐
│  [DB 24 ●130]  [DB 25 ●106]  [DB 26 ●59] [DB 27 ●31]│  green = healthy
│  [DB 28 ●12]  [DB 29 ●5]    [DB 30 ●23] [DB 31+ ●86]│  red = critical
└─────────────────────────────────────────────────────┘
```

- Power buckets: `< -24` healthy / `-24 to -27` warning / `> -27` critical / `> -31` dead
- প্রতি card ক্লিকে dialog → ওই bucket-এর সব ONU list (OLT, MAC, PPPoE, RX, port, last seen)
- "Download" icon → CSV export
- GPON port utilization panel (`OLT-100.26 | Port Used: 685`) — `onu_list` group by `interface`

Permission: `olt.dashboard.view`

---

## 3) ONU Detail Page (`/dashboard/olt/onu/:id`)

Reference image-120-এর মতো panel grid:

- Top cards: Uptime, PPPoE ID, dBm, Up/Down, OLT name, Vendor, Router brand, Remote addr, Temp/VLAN, Last update, Last disconnect, Port number, Down count
- "Previous dBm" row (last reading snapshot)
- **Chart**: recharts line graph from `onu_history` table — RX power over time, day filter tabs (All/Sun/Mon/Tue...)
- Row click `OnuList.tsx` → navigate এ যাবে এই page-এ

Permission: `olt.onu.view`

---

## 4) Switch Management

### A) DB extend
- `switches` table-এ যোগ: `vendor`, `snmp_community`, `snmp_version`, `username`, `password_encrypted`, `description`, `model`, `firmware`
- নতুন table `switch_ports`: `id, switch_id, interface, description, enabled, speed, duplex, status, tx_power, rx_power, mac_address, vlan_id, last_synced`
- নতুন table `switch_vlans`: `id, switch_id, vlan_id, name, tagged_ports[], untagged_ports[]`

### B) Pages

**`/dashboard/network/switches`** (Switch List — image-124)
- Table: OLT/Switch name, Port, Status, TX/RX power, Details
- "Sw Connect" button → Add/Edit dialog
- Row click → Switch Detail

**`/dashboard/network/switches/:id`** (Switch Detail — image-121,122,123)
3 tabs:
- **SFP Info**: Switch info card + interface-wise TX/RX/Bias table
- **Interface State**: per-port speed/duplex/flow/in-out rate/MAC (image-123)
- **Port Shutdown**: per-port toggle switches (image-122) — `switch.port.toggle` permission
- Each port row: edit description (`switch.port.edit`), VLAN assignment (`switch.vlan.manage`), live traffic mini-chart (`switch.traffic.view`)

### C) Edge functions (SNMP/CLI)
- `snmp-fetch-switch-info` — sysName, sysDescr, uptime, CPU, mem
- `snmp-fetch-switch-ports` — IF-MIB walk: ifDescr, ifOperStatus, ifAdminStatus, ifSpeed, ifInOctets, ifOutOctets, ifPhysAddress
- `snmp-fetch-switch-sfp` — vendor-specific SFP DOM OID for TX/RX
- `switch-port-toggle` — SNMP SET ifAdminStatus (1=up, 2=down) — **permission check first**
- `switch-port-update` — description/VLAN change — **permission check first**
- `switch-traffic-poll` — 30s polling for live in/out octets → store in `switch_traffic_samples` table

সব edge function: header থেকে JWT → user_id → `has_device_permission` RPC call → unauthorized হলে 403।

### D) Live traffic
Small recharts area chart in port row, polling `switch_traffic_samples` every 5s (last 60 points). On-demand only when expanded।

---

## Files

**Migration:**
- `device_permissions` table + RLS + `has_device_permission()` SECURITY DEFINER function
- Extend `switches` columns
- New: `switch_ports`, `switch_vlans`, `switch_traffic_samples`

**Create:**
- `src/hooks/usePermission.ts`
- `src/components/PermissionGate.tsx`
- `src/pages/dashboard/olt/PowerDashboard.tsx`
- `src/pages/dashboard/olt/OnuDetail.tsx`
- `src/pages/dashboard/network/SwitchList.tsx` (replace placeholder)
- `src/pages/dashboard/network/SwitchDetail.tsx`
- `src/pages/dashboard/system/DevicePermissions.tsx` (admin grants)
- Edge functions: `snmp-fetch-switch-info`, `snmp-fetch-switch-ports`, `snmp-fetch-switch-sfp`, `switch-port-toggle`, `switch-port-update`, `switch-traffic-poll`

**Edit:**
- `src/App.tsx` — 4 new routes
- `src/components/AppSidebar.tsx` — menu entries (visibility-gated by permission)
- `src/pages/dashboard/olt/OnuList.tsx` — row → ONU Detail link
- existing `OltDevices.tsx` — "Power Dashboard" CTA

---

## Security guarantees

- প্রতিটা destructive action (port toggle, VLAN change) — **server-side** permission check, frontend hide শুধু UX
- RLS policies use `has_device_permission()` — never trust client claims
- SNMP credentials encrypted column, never returned to frontend
- Edge function logs audit trail in `device_audit_log` (who toggled which port when)

