# ISPDesk Self-Hosting Guide (Hybrid Pattern)

> **Pattern:** Local primary server + nightly cloud backup
> **OS:** Ubuntu 22.04 LTS (recommended)
> **Target:** ISP owner who wants full control of data, runs locally, keeps cloud as DR backup only.

---

## 1. Overview

### Components

| Layer | Software | Port | Role |
|---|---|---|---|
| Reverse proxy | Caddy / Nginx | 80/443 | TLS, routing |
| Frontend | React (Vite build → static) | served by Caddy | ERP + Public site |
| API Gateway | Kong (bundled with Supabase) | 8000 | Routes to PostgREST/Auth/Storage/Edge |
| Database | Postgres 15 | 5432 (LAN only) | Main data store |
| Auth | GoTrue | internal | User auth (JWT) |
| REST API | PostgREST | internal | Auto REST from schema |
| Realtime | Realtime server | internal | WebSocket subscriptions |
| Storage | Storage API + MinIO/S3 | internal | File uploads |
| Edge Functions | Deno edge-runtime | internal | 60+ business logic functions |
| Polling Agent | Node.js (pm2) | — | SNMP poll OLT/MikroTik |
| Backup | cron + restic/rclone | — | Nightly dump → cloud |

### Hybrid Topology

```text
                       ┌────────────────────────┐
                       │  Customer / Internet   │
                       └───────────┬────────────┘
                                   │ HTTPS
                       ┌───────────▼────────────┐
                       │  Router (port-forward) │
                       │  80/443 → server       │
                       └───────────┬────────────┘
                                   │
   ┌───────────────────────────────▼─────────────────────────────┐
   │  LOCAL SERVER (Ubuntu 22.04)                                │
   │                                                              │
   │   Caddy ─┬─→ portal.yourisp.com  → React static (portal)    │
   │          ├─→ admin.yourisp.com   → React static (ERP)       │
   │          └─→ api.yourisp.com     → Kong :8000               │
   │                                       │                      │
   │   ┌───────────────────────────────────▼──────────────────┐  │
   │   │  Supabase stack (docker compose)                     │  │
   │   │  Postgres • GoTrue • PostgREST • Realtime •          │  │
   │   │  Storage • Edge Runtime • Studio                     │  │
   │   └──────────────────────────────────────────────────────┘  │
   │                                                              │
   │   pm2 → polling-agent.js (SNMP to OLT/MikroTik on LAN)      │
   │                                                              │
   │   cron → nightly pg_dump + storage rsync → ☁ S3/Backblaze   │
   └──────────────────────────────────────────────────────────────┘
                                   │
                                   │ LAN (UDP 161 SNMP)
                       ┌───────────▼────────────┐
                       │ OLT / MikroTik / Switch│
                       └────────────────────────┘
```

---

## 2. Hardware & OS

### Recommended Spec

| Item | Spec |
|---|---|
| CPU | 8 core (Intel Xeon / AMD Ryzen 5+) |
| RAM | 16-32 GB |
| Disk | 500 GB NVMe (system+DB) + 1 TB HDD (backup) |
| Network | 1 Gbps NIC, static LAN IP, dual ISP preferred |
| Power | Online