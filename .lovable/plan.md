

## OLT Device — SNMP Configuration Fields যোগ

OLT ডিভাইসে SNMP-based monitoring-এর জন্য নতুন fields যোগ করা হবে। এতে SNMP দিয়ে OLT data collect করা যাবে।

---

### 1. Database Migration — নতুন Columns

`olt_devices` table-এ যোগ হবে:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `snmp_ip` | text | null | SNMP IP (main IP থেকে আলাদা হতে পারে) |
| `snmp_port` | integer | 161 | SNMP port |
| `snmp_community` | text | 'public' | Community string (v1/v2c) |
| `snmp_version` | text | 'v2c' | SNMP version (v1, v2c, v3) |
| `snmp_enabled` | boolean | false | SNMP monitoring on/off |
| `brand_model` | text | null | OLT brand/model name |
| `olt_version` | text | null | Software version |

### 2. OltDevices.tsx — Form Update

Add/Edit dialog-এ নতুন section "SNMP Configuration" যোগ হবে:
- **SNMP Enabled** — Switch toggle
- **SNMP IP** — Input (default: main IP copy)
- **SNMP Port** — Input (default: 161)
- **SNMP Community** — Input (default: "public")
- **SNMP Version** — Select (v1, v2c, v3)
- **Brand/Model** — Input
- **OLT Version** — Input

Table-এ নতুন column: **SNMP** (enabled/disabled badge), **Brand/Model**

### 3. MikroTik Link Column

Table-এ MikroTik linked device name দেখাবে (already `mikrotik_id` FK আছে, শুধু join display যোগ)।

---

### Files

| File | Change |
|------|--------|
| Migration SQL | `olt_devices`-এ ৭টি নতুন column |
| `src/pages/dashboard/olt/OltDevices.tsx` | Form-এ SNMP section, table-এ SNMP ও Brand columns |

