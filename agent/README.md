# ISPDesk Polling Agent

আপনার অফিসের যেকোনো একটা PC/সার্ভারে এই agent চালান যেটা আপনার OLT-এর সাথে একই LAN-এ আছে। Agent প্রতি 30 সেকেন্ডে SNMP দিয়ে OLT poll করে এবং ISPDesk dashboard-এ data পাঠায়।

## Setup (Windows / Linux / macOS)

### 1. Node.js ইনস্টল করুন
- Windows: https://nodejs.org থেকে LTS (18+) ডাউনলোড করে install করুন।
- Linux/Ubuntu: `sudo apt install nodejs npm`

### 2. Agent ডাউনলোড ও setup
```bash
cd agent
npm install
cp config.example.json config.json
```

### 3. Config edit করুন
`config.json` খুলে `api_key` paste করুন — এটা Dashboard → Device Admin → Polling Agents পেজ থেকে পাবেন।

### 4. Agent চালু করুন
```bash
npm start
```

আপনি দেখবেন:
```
ISPDesk Agent v1.0.0 starting — polling every 30s
[2026-...] heartbeat ok — 1 OLT(s) assigned
  → BDCOM-OLT (bdcom/gpon): reachable=true onus=24 ingest={"ok":true,"processed":24}
```

## Background-এ চালানো (Production)

### Linux (PM2)
```bash
sudo npm install -g pm2
pm2 start polling-agent.js --name ispdesk-agent
pm2 save && pm2 startup
```

### Windows (NSSM)
1. https://nssm.cc থেকে NSSM ডাউনলোড করুন
2. `nssm install ISPDeskAgent "C:\Program Files\nodejs\node.exe" "C:\path\to\polling-agent.js"`
3. Services → ISPDeskAgent → Start

## Troubleshooting

- **"SNMP timeout"** → OLT-এ SNMP enable আছে? Community string ঠিক? Firewall UDP 161 block করছে?
- **"invalid api key"** → Dashboard থেকে api_key আবার copy করে paste করুন।
- **OLT online কিন্তু ONU 0** → Vendor/PON type OID profile-এ সমস্যা। Dashboard-এ vendor + PON type (EPON/GPON) ঠিক set করুন।

## Firewall

Agent শুধু **outbound HTTPS (443)** ব্যবহার করে Supabase-এ data পাঠাতে। OLT-এর সাথে **UDP 161** লাগবে। আপনার OLT-কে internet-এ expose করতে হবে না — agent LAN থেকেই poll করে।
