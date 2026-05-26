## আসল কথা

হ্যাঁ, ঠিক বলেছেন — production ISP monitoring (Zabbix, PRTG, LibreNMS, The Dude, Smokeping) সবাই **SNMP UDP port 161** ব্যবহার করে। ONU RX power, distance, status, uptime — সব SNMP walk দিয়েই আসে।

কিন্তু একটা technical সমস্যা আছে যেটা পরিষ্কার করতে হবে:

> **Supabase Edge Functions UDP support করে না — শুধু TCP/HTTP।**

মানে cloud থেকে সরাসরি SNMP query পাঠানো সম্ভব না। এজন্য সব serious NMS (Zabbix, LibreNMS ইত্যাদি) **on-premise server/agent** চালায় — সেই agent SNMP করে, তারপর data central server-এ পাঠায়।

আমাদেরও একই pattern লাগবে।

## Architecture

```text
[BDCOM OLT]  ←── UDP 161 SNMP ──→  [Polling Agent (অফিস PC/VPS)]
   LAN IP                              Node.js script
                                         │
                                         │  HTTPS POST (every 30s)
                                         ▼
                              [Supabase Edge Function]
                              ingest-snmp-data
                                         │
                                         ▼
                              [olt_devices, onu_list, alerts]
                                         │
                                         ▼
                                  Dashboard UI
```

Agent আপনার office-এর যেকোনো একটা PC-তে চলবে (Windows/Linux), OLT-এর সাথে same LAN-এ। OLT-কে internet-এ expose করতে হবে না।

## কী বানাবো

### 1. Polling Agent (`agent/` folder, repo-এর বাইরে download করার জন্য)

- `polling-agent.js` — Node.js script, `net-snmp` npm package use করে।
- `config.json` — agent_id, supabase_url, api_key, poll_interval।
- `README.md` — Windows/Linux setup steps (Node install → `npm install` → `node polling-agent.js`)।
- `install.bat` / `install.sh` — one-click installer।
- PM2 / Windows Service দিয়ে background-এ চালানোর instruction।

Agent প্রতি 30 sec এ যা করবে:
1. Supabase থেকে নিজের assigned OLT list pull করবে (agent_id দিয়ে)।
2. প্রতিটা OLT-তে SNMP walk:
   - sysName, sysUpTime, sysDescr (device meta)
   - vendor-specific OID দিয়ে ONU list (interface, MAC, serial, status, RX power, distance, temp)
3. সব data `ingest-snmp-data` edge function-এ POST করবে।

### 2. Database changes

- নতুন table `polling_agents` (id, tenant_id, name, api_key, last_heartbeat, status)
- `olt_devices.assigned_agent_id` column — কোন agent এই OLT poll করবে
- BDCOM EPON/GPON OID mapping আগের migration-এ আছে — verify করে আরো নিখুঁত OID seed করব (research করে)

### 3. Edge functions

- `agent-heartbeat` — agent online status update + assigned OLT list return
- `ingest-snmp-data` — agent থেকে পাওয়া SNMP data process → olt_devices/onu_list update + alert generate (rx_power thresholds)
- পুরনো `snmp-poll-device` deprecated করব (TCP probe শুধু "online check" হিসেবে রাখা যায়)

### 4. UI

- `/dashboard/device-admin/polling-agents` — নতুন page:
  - Agent তৈরি → API key generate
  - Download instructions (Windows/Linux)
  - Last heartbeat status
  - কোন OLT কোন agent-এ assigned
- OLT add/edit dialog-এ "Assigned Agent" dropdown
- OLT detail page-এ "Last SNMP poll" timestamp এবং data source badge

## Setup flow (user-এর জন্য)

1. Dashboard → Polling Agents → "Add Agent" → API key পাবেন।
2. Office-এর একটা PC-তে Node.js install করুন।
3. Agent zip download → extract → `config.json`-এ API key paste।
4. `node polling-agent.js` চালান (অথবা service হিসেবে install)।
5. Dashboard-এ agent online দেখাবে → OLT-গুলোকে এই agent-এ assign করুন।
6. 30 sec পর real SNMP data আসা শুরু হবে — RX power, ONU list, status সব।

## এই plan-এ যেটা নাই

- Cloud VPS-এ agent host করার option (পরে যোগ করা যাবে)
- Mass agent management (একাধিক agent load balancing)
- SNMP v3 (encryption) — শুরুতে শুধু v2c

## প্রশ্ন

Approve করলে আগে **agent code + database + ingest function** বানাবো, তারপর UI। মোট ~4-5 ধাপে complete হবে।

শুরু করব?
