# Windows .exe Build Guide

এই agent কে standalone Windows `.exe` বানাতে হবে যাতে target PC-তে Node.js install না করেও চালানো যায়।

## Build (এক বারের কাজ — আপনার dev PC-তে)

```bash
cd agent
npm install
npx @yao-pkg/pkg . --targets node18-win-x64 --output dist/ispdesk-agent.exe
```

অথবা script দিয়ে:
```bash
npm run build:win
```

Build শেষে `agent/dist/ispdesk-agent.exe` (~40-50 MB) তৈরি হবে।

## Deployment (target/office PC-তে)

1. একটা folder বানান, যেমন `C:\ispdesk-agent\`
2. সেখানে রাখুন:
   - `ispdesk-agent.exe`
   - `config.json` (UI থেকে "Download config.json" দিয়ে নামান)
3. Double-click `ispdesk-agent.exe` — console window-তে log দেখাবে।

## Windows Service হিসেবে চালাতে (auto-start)

`nssm` (Non-Sucking Service Manager) ব্যবহার করুন:

```cmd
nssm install ISPDeskAgent "C:\ispdesk-agent\ispdesk-agent.exe"
nssm set ISPDeskAgent AppDirectory "C:\ispdesk-agent"
nssm start ISPDeskAgent
```

এখন PC reboot হলেও agent auto-start হবে।

## Troubleshooting

- **"config.json not found"** → exe-এর পাশে config.json রাখুন।
- **Firewall block** → outbound HTTPS (443) allow করুন, inbound কিছু লাগবে না।
- **SNMP timeout** → OLT-এর SNMP community ও IP config.json-এ যাচাই করুন।
