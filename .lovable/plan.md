# OLT/ONU NexOLT-style Mobile App + Reseller Scope

পুরো OLT/ONU module-কে NexOLT app-এর মত mobile-first design এ rebuild করব, একই সাথে desktop responsive রাখব, এবং reseller-দের জন্য admin-assigned OLT access যোগ করব।

## নতুন routes

```
/m/olt                        → OLT list (NexOLT home screen)
/m/olt/:id                    → Overview tab (Connected to / CPU / Memory / Uptime / Device Info)
/m/olt/:id/onus               → ONU List tab (PON filter, All/Online/Offline tabs, ONU cards)
/m/olt/:id/onus/:onuId        → ONU detail sheet (Info + Action tabs)
/m/olt/:id/more               → Advanced Diagnostics grid (Uplink, PON, MAC Table, Down, Health, Reader)
/m/olt/calculator             → Optical Power & Splitter Calculator (modal-style)
/m/olt/mac-table              → Global MAC table viewer
```

Bottom tab bar প্রতি OLT screen-এ: **Overview · ONU List · More** (image-293/295 অনুসারে)। Top-level `/m/olt` screen-এ shortcut + calculator + settings আইকন (image-296)।

Desktop responsive: existing `/dashboard/olt/*` pages-গুলো একই data hooks share করবে, mobile route থাকলে phone থেকে auto-redirect হবে `/m/olt`-এ।

## Screens — design details

### 1. `/m/olt` — OLT List (image-296 style)
- Top bar: brand name + `+` (Add OLT) + calculator + settings আইকন
- Filter chips row: **ALL / Search / Vendor chips** (BDCOM, BDPON, VSOL, C-DATA, MikroTik...)
- OLT card: brand logo box (left), name + vendor·protocol (right), live status dot, `×` quick action
- Long-press → action sheet (Edit / Delete / Assign to reseller)

### 2. `/m/olt/:id` Overview (image-293)
- Gradient hero card: brand logo + "Connected to {alias}" + Total ONUs `{online}/{total}` + CPU% / Memory% / Uptime tiles
- Device Information card: Serial / HW / FW / MAC / Model / Software time
- System Information card: System Name / System Time / License limit
- 4 action buttons: **Refresh Information** (blue), **Disconnect from OLT** (red), **Save Configuration** (green), **Reboot OLT** (orange)

### 3. `/m/olt/:id/onus` ONU List (image-292)
- PON dropdown (PON1, PON2...) + refresh + search icon row
- 3-tab pill: **All ({n}) / Online ({n}) / Offline ({n})**
- ONU card layout:
  - ONU icon (left) — distinct icon per status (online: blue/yellow port, offline: greyed)
  - **Name** = MAC-based name (fallback to PPPoE user থাকলে username)
  - Sub-line: `interface` (GPON0/1:5)
  - Right: **Online/Offline** pill (green/red)
  - Divider line
  - Bottom row: `MAC | Model` left, `RX Power: -19.71 dBm` right
  - Offline এ red border + extra row: **Reason: {last_offline_reason}**, **Distance: {distance} m**

### 4. `/m/olt/:id/onus/:onuId` ONU Detail (image-297, 298)
- Bottom sheet (mobile) / dialog (desktop), title `ONU Details: {name}` + pencil edit icon
- 2-tab pill: **INFO / ACTION**
- INFO tab fields: ONU ID, MAC Address, Status, **Distance**, Alive Time, Last Register, Vendor ID, Model ID, ONU Type, Ethernet Count, WiFi Count, Response Time, Temperature, Receive Power
- ACTION tab buttons (gradient): **Reboot ONU** (orange), **Bind Profile** (blue), **ONU MAC Table** (green), **ONU Port Status** (purple)

### 5. `/m/olt/:id/more` Advanced Diagnostics (image-295)
- 2-column tile grid: Uplink Ports, PON Ports, MAC Table, ONU Down Detection, ONU Health, ONU Reader, NEXSYNC (agent sync)

### 6. `/m/olt/calculator` Optical Link Calculator (image-294)
- 2-tab: **SPLITTER / DISTANCE**
- Splitter: Input Power (dBm) + Splitter Type dropdown (10:90, 20:80, 30:70, 40:60, 50:50, 1:2, 1:4, 1:8, 1:16, 1:32, 1:64) → result cards with output dBm
- Distance: Input Power + Distance (km) + Cable loss (dB/km, default 0.35) → output dBm

## Reseller OLT Access (Admin-assigned)

নতুন table:
```
olt_reseller_access (
  id uuid pk,
  olt_id uuid → olt_devices,
  reseller_branch_manager_id uuid → branch_managers,
  granted_by uuid (admin),
  granted_at timestamptz,
  unique(olt_id, reseller_branch_manager_id)
)
```

- Admin UI: `/dashboard/olt/:id` edit form-এ নতুন section **"Assign to Reseller(s)"** — multi-select dropdown of resellers (multiple OLT একজনের / একটা OLT একাধিক reseller — সব valid)
- RLS: reseller (POP user) `olt_devices` SELECT করতে পারবে যদি branch_id own করে **অথবা** `olt_reseller_access`-এ entry থাকে
- Reseller mobile/portal-এ same `/m/olt` route, কিন্তু list filtered হবে assigned OLT-গুলোতে
- Reseller-কে write action (delete OLT, edit) দেওয়া হবে না — শুধু read + ONU read + reboot ONU permission

## Data — distance & last_offline_reason

`onu_list` table-এ নতুন columns:
- `distance_m integer` (meters)
- `last_offline_at timestamptz`
- `last_offline_reason text` (DyingGasp, LOS, LOSi, PowerOff, LinkLoss, etc.)
- `alive_time interval`
- `temperature numeric`

**Two data paths:**
1. **Agent push (priority)** — `sync-olt-data` edge function extend, agent পাঠাবে `distance`, `offline_reason`, `temperature`, `alive_time`। Status transition online→offline হলে current timestamp + reason snapshot save।
2. **SNMP fallback** — নতুন edge function `snmp-fetch-onu-distance` (Huawei/ZTE/VSOL/BDCOM OID set), `/dashboard/olt/:id/onus` থেকে manual "Refresh" trigger।

## Files

**New (mobile shell + screens):**
- `src/components/olt-mobile/OltMobileShell.tsx` — bottom tab + scope theme
- `src/components/olt-mobile/OltCard.tsx`, `OnuCard.tsx`, `OltHeroCard.tsx`, `ActionButton.tsx`, `VendorIcon.tsx`
- `src/pages/olt-mobile/OltList.tsx`
- `src/pages/olt-mobile/OltOverview.tsx`
- `src/pages/olt-mobile/OltOnuList.tsx`
- `src/pages/olt-mobile/OnuDetailSheet.tsx`
- `src/pages/olt-mobile/OltMore.tsx`
- `src/pages/olt-mobile/OpticalCalculator.tsx`
- `src/pages/olt-mobile/MacTable.tsx`
- `src/pages/olt-mobile/OnuHealth.tsx`
- `src/lib/opticalCalc.ts` — splitter loss table + distance loss formula
- `src/hooks/useOltAccess.ts` — admin vs reseller filter helper

**Modify:**
- `src/App.tsx` — add `/m/olt/*` routes, mobile detect redirect for `/dashboard/olt` on small screens (toggle-able)
- `src/pages/dashboard/olt/OltDevices.tsx` — add "Assign to Resellers" section
- `supabase/functions/sync-olt-data/index.ts` — accept distance/reason/temperature, snapshot last_offline_reason on transition

**New edge function:**
- `supabase/functions/snmp-fetch-onu-distance/index.ts` — vendor-specific OID GET for distance + last alarm

## Migrations

1. `onu_list` add: `distance_m`, `last_offline_at`, `last_offline_reason`, `alive_time`, `temperature`, `vendor_id`, `model_id`, `onu_type`, `ethernet_count`, `wifi_count`, `response_time_ms`
2. `olt_reseller_access` table + RLS
3. Update RLS on `olt_devices` and `onu_list` to honor reseller access
4. Index: `onu_list(olt_id, status, interface)`, `olt_reseller_access(reseller_branch_manager_id)`

## Execution order (4 parts)

**Part A — DB + RLS:** migration for ONU columns, `olt_reseller_access`, updated RLS
**Part B — Mobile shell + OLT list + Overview:** routes, shell, list/overview screens with NexOLT visual fidelity
**Part C — ONU list + Detail sheet + Calculator:** card grid, info/action tabs, optical calculator
**Part D — More menu + MAC table + Health + Reseller assignment UI + agent extension**

Approve করলে Part A থেকে শুরু করব।
