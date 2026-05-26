# Polling Agent → `ingest-snmp-data` Contract

Naeem-PC (or any on-prem polling agent) walks SNMP locally and POSTs snapshots here.
Edge runtime cannot do UDP, so the agent owns all SNMP I/O.

## Endpoint

`POST https://<project>.supabase.co/functions/v1/ingest-snmp-data`

Headers:
- `x-agent-key: <polling_agents.api_key>`
- `Content-Type: application/json`

## Body

```json
{
  "olt_id": "uuid",
  "reachable": true,
  "olt_meta": {
    "cpu_usage": 12,
    "memory_usage": 34,
    "uptime": 123456,
    "brand_model": "BDCOM(tm) GP3600-08B ...",
    "firmware_version": "117819",
    "total_onus": 42,
    "online_onus": 39
  },
  "onus": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "interface": "EPON0/1:5",
      "serial_number": "BDCMxxxxxxxx",
      "description": "Customer-7th-floor",
      "status": "online",
      "rx_power": -22.5,
      "tx_power": 2.1,
      "distance_m": 245,
      "temperature": 41,
      "alive_seconds": 86400,
      "onu_type": "BDCOM-1GE"
    }
  ],
  "pon_ports": [
    {
      "port_name": "EPON0/1",
      "port_type": "epon",
      "admin_status": "up",
      "oper_status": "up",
      "speed_mbps": 1000,
      "total_onus": 12,
      "online_onus": 11,
      "rx_power_dbm": -18.5,
      "description": "uplink-A"
    },
    { "port_name": "GigaEthernet0/1", "port_type": "sfp", "oper_status": "up" }
  ]
}
```

> `port_type` values: `epon | gpon | sfp | sfp+ | uplink | other`. Derive from
> `ifType` (OID 1.3.6.1.2.1.2.2.1.3) + port_name pattern. Also send `ifAdminStatus`
> (1.3.6.1.2.1.2.2.1.7) and `ifSpeed` (1.3.6.1.2.1.2.2.1.5) when available.

## BDCOM EPON OIDs (reference)

| Data | OID |
|------|-----|
| sysDescr (brand_model) | `1.3.6.1.2.1.1.1.0` |
| sysUpTime | `1.3.6.1.2.1.1.3.0` |
| ifDescr (PON ports) | `1.3.6.1.2.1.2.2.1.2` |
| ifOperStatus | `1.3.6.1.2.1.2.2.1.8` |
| ONU MAC table | `1.3.6.1.4.1.3320.101.10.1.1.3` |
| ONU description | `1.3.6.1.4.1.3320.101.10.1.1.10` |
| ONU online status | `1.3.6.1.4.1.3320.101.108.1.1.2` |
| ONU Rx power (×10 dBm) | `1.3.6.1.4.1.3320.101.10.5.1.5` |
| ONU Tx power (×10 dBm) | `1.3.6.1.4.1.3320.101.10.5.1.6` |
| ONU distance (m) | `1.3.6.1.4.1.3320.101.10.1.1.27` |

> ONU index → PON port mapping: ifIndex encodes `slot/port:llid`. Agent should
> decode and emit a stable `interface` string (e.g. `EPON0/1:5`).

## Polling cadence

- Heartbeat: every `polling_agents.poll_interval_seconds` (default 60s)
- Full ONU snapshot: every poll cycle for assigned OLTs
- Trigger: dashboard "এখনই Poll" button calls `snmp-poll-device` — agent picks up on next cycle

## Response

```json
{ "ok": true, "processed": 39, "ports": 8, "alerts": 2 }
```

Alerts auto-fire on Rx power: `< -24 dBm` warning, `< -27 dBm` critical.
