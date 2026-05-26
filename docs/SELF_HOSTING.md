# ISPDesk Self-Hosting Guide (Hybrid Pattern)

> **Pattern:** Local primary server + nightly cloud backup
> **OS:** Ubuntu 22.04 LTS (recommended)
> **Audience:** ISP owner / network admin চান নিজের data control নিজের কাছে রাখতে।

---

## 1. Overview

### Components

| Layer | Software | Port | Role |
|---|---|---|---|
| Reverse proxy | Caddy | 80/443 | Auto-TLS, routing |
| Frontend | React (Vite build → static) | served by Caddy | ERP + Public site |
| API Gateway | Kong (Supabase-bundled) | 8000 | Routes to PostgREST/Auth/Storage/Edge |
| Database | Postgres 15 | 5432 (LAN only) | Main data store |
| Auth | GoTrue | internal | JWT auth |
| REST API | PostgREST | internal | Auto-REST from schema |
| Realtime | realtime-rs | internal | WebSocket |
| Storage | storage-api + S3/MinIO | internal | File upload |
| Edge Functions | Deno edge-runtime | internal | 60+ functions |
| Polling Agent | Node.js (pm2) | — | SNMP poll OLT/MikroTik |
| Backup | cron + restic/rclone | — | Nightly → cloud |

### Hybrid Topology

```text
                       ┌────────────────────────┐
                       │  Customer / Internet   │
                       └───────────┬────────────┘
                                   │ HTTPS
                       ┌───────────▼────────────┐
                       │  Router (port-forward) │
                       │  80/443 → server LAN IP│
                       └───────────┬────────────┘
                                   │
   ┌───────────────────────────────▼──────────────────────────┐
   │  LOCAL SERVER (Ubuntu 22.04)                             │
   │                                                           │
   │   Caddy ─┬─→ portal.yourisp.com → React (portal)         │
   │          ├─→ admin.yourisp.com  → React (ERP)            │
   │          └─→ api.yourisp.com    → Kong :8000             │
   │                                       │                   │
   │   ┌───────────────────────────────────▼───────────────┐  │
   │   │  Supabase stack (docker compose)                  │  │
   │   │  postgres • gotrue • postgrest • realtime •       │  │
   │   │  storage-api • edge-runtime • studio • kong       │  │
   │   └───────────────────────────────────────────────────┘  │
   │                                                           │
   │   pm2 → polling-agent.js  (SNMP → OLT/MikroTik LAN)      │
   │                                                           │
   │   cron → pg_dump + storage rsync → ☁ S3/Backblaze        │
   └───────────────────────────────────────────────────────────┘
                                   │ LAN UDP 161
                       ┌───────────▼────────────┐
                       │ OLT / MikroTik / Switch│
                       └────────────────────────┘
```

---

## 2. Hardware & OS

| Item | Minimum | Recommended |
|---|---|---|
| CPU | 4 core | 8 core (Xeon / Ryzen 5+) |
| RAM | 8 GB | 16-32 GB |
| Disk | 256 GB SSD | 500 GB NVMe + 1 TB HDD |
| Network | 1 Gbps NIC, static LAN IP | + dual ISP |
| Power | UPS 30 min | Online UPS + generator |

### OS Install
```bash
# Ubuntu 22.04 LTS Server (minimal)
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget htop ufw fail2ban unattended-upgrades \
  ca-certificates gnupg lsb-release rsync cron tmux
sudo timedatectl set-timezone Asia/Dhaka
```

### Firewall base
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP (Caddy → 443 redirect)
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable
```
> Postgres 5432 / Kong 8000 / Studio 3000 — **NEVER open to internet**, only LAN bind।

---

## 3. Installation — Step by Step

### 3.1 Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

### 3.2 Self-hosted Supabase

```bash
mkdir -p /opt && cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

#### Generate JWT secrets
```bash
# 1) JWT_SECRET (40+ chars)
openssl rand -base64 48

# 2) ANON_KEY ও SERVICE_ROLE_KEY — Supabase JWT generator use করুন:
#    https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
# অথবা node দিয়ে:
docker run --rm -e JWT_SECRET=<your_secret> supabase/postgres-meta \
  node -e "console.log(require('jsonwebtoken').sign({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10},process.env.JWT_SECRET))"
```

#### `.env` key fields
```bash
POSTGRES_PASSWORD=<strong-32-char>
JWT_SECRET=<from openssl>
ANON_KEY=<generated>
SERVICE_ROLE_KEY=<generated>

SITE_URL=https://admin.yourisp.com
API_EXTERNAL_URL=https://api.yourisp.com
SUPABASE_PUBLIC_URL=https://api.yourisp.com

# SMTP (auth emails)
SMTP_ADMIN_EMAIL=admin@yourisp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASS=<app-password>
SMTP_SENDER_NAME=ISPDesk

# Studio
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=<strong>
```

#### Start
```bash
docker compose pull
docker compose up -d
docker compose ps   # সব service "healthy" দেখাতে হবে
```

#### Verify
- Studio:  `http://<server-lan-ip>:3000`  (login: DASHBOARD_USERNAME/PASSWORD)
- Kong API:  `http://<server-lan-ip>:8000/rest/v1/` → 401 (expected without key)
- Postgres:  `docker compose exec db psql -U postgres -c '\l'`

---

### 3.3 Database Schema (Migration Apply)

আপনার project-এর `supabase/migrations/` folder-এর সব `.sql` file timestamp order-এ apply করতে হবে।

```bash
# project clone
cd /opt && git clone <your-ispdesk-repo> ispdesk
cd ispdesk

# Postgres container-এ migration apply
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
    psql -U postgres -d postgres < "$f"
done
```

#### Initial seed (one-time)
```sql
-- Studio SQL Editor-এ run করুন
-- 1) App vault key (link password encryption)
INSERT INTO public.app_vault(key, value)
VALUES ('link_vault_key', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (key) DO NOTHING;

-- 2) Super-admin user — Auth → Users থেকে create করার পর:
INSERT INTO public.user_roles(user_id, role)
VALUES ('<paste-uuid>', 'super_admin');

-- 3) Default branch (যদি প্রয়োজন)
INSERT INTO public.branches(name, location) VALUES ('HQ', 'Dhaka');
```

#### Verify
```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace;
```

---

### 3.4 Edge Functions

```bash
# Supabase CLI
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
  | sudo tar -xz -C /usr/local/bin supabase
supabase --version

cd /opt/ispdesk

# Self-hosted instance-এ login (URL = Kong, key = service_role)
supabase link --project-ref local \
  --workdir . \
  --db-url "postgresql://postgres:<pw>@localhost:5432/postgres"

# সব function deploy
for d in supabase/functions/*/; do
  name=$(basename "$d")
  [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name" --no-verify-jwt
done
```

#### Edge function secrets
```bash
supabase secrets set \
  SUPABASE_URL=https://api.yourisp.com \
  SUPABASE_ANON_KEY=<anon> \
  SUPABASE_SERVICE_ROLE_KEY=<service> \
  SMTP_HOST=smtp.gmail.com SMTP_USER=... SMTP_PASS=... \
  TELEGRAM_BOT_TOKEN=... \
  BKASH_APP_KEY=... BKASH_APP_SECRET=... \
  NAGAD_MERCHANT_ID=... \
  SSLCOMMERZ_STORE_ID=...
```
> AI feature use না করলে `LOVABLE_API_KEY` লাগবে না।

---

### 3.5 Frontend Build & Serve

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

cd /opt/ispdesk

# .env (production)
cat > .env <<EOF
VITE_SUPABASE_PROJECT_ID=local
VITE_SUPABASE_URL=https://api.yourisp.com
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
EOF

npm install
npm run build
sudo mkdir -p /var/www/ispdesk
sudo cp -r dist/* /var/www/ispdesk/
```

#### Caddy install + config
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:
```caddy
# Public customer portal + ERP (same React build, route-based split)
admin.yourisp.com, portal.yourisp.com {
    root * /var/www/ispdesk
    try_files {path} /index.html
    file_server
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }
}

# Supabase API
api.yourisp.com {
    reverse_proxy localhost:8000
    encode gzip
}
```

```bash
sudo systemctl reload caddy
# Caddy auto Let's Encrypt cert নিয়ে নেবে (port 80/443 open থাকতে হবে)
```

---

### 3.6 Polling Agent (একই server)

```bash
cd /opt/ispdesk/agent
npm install
cp config.example.json config.json
```

`config.json`:
```json
{
  "supabase_url": "http://localhost:8000",
  "api_key": "<paste from Dashboard → Polling Agents>",
  "poll_interval_seconds": 30
}
```

```bash
sudo npm install -g pm2
pm2 start polling-agent.js --name ispdesk-agent
pm2 save
pm2 startup systemd     # boot-এ auto-start
```

> Multi-branch: প্রতিটা branch-এ একটা করে agent। প্রতিটার আলাদা `api_key`।

---

## 4. Hybrid Backup Setup

### 4.1 Nightly Postgres dump → cloud

```bash
sudo mkdir -p /backup/{daily,weekly,monthly}
sudo apt install -y rclone

# rclone configure (S3 / Backblaze / Google Drive)
rclone config   # interactive
# → remote name: cloud
```

`/usr/local/bin/ispdesk-backup.sh`:
```bash
#!/bin/bash
set -e
TS=$(date +%Y%m%d-%H%M)
OUT=/backup/daily/db-$TS.sql.gz

docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
  pg_dump -U postgres -Fc postgres | gzip > "$OUT"

# Storage files
tar czf /backup/daily/storage-$TS.tgz -C /opt/supabase/docker/volumes storage

# Push to cloud
rclone copy /backup/daily/ cloud:ispdesk-backup/daily/ --max-age 24h

# Retention: 7 daily, 4 weekly, 12 monthly
find /backup/daily -mtime +7 -delete
[ $(date +%u) = 7 ] && cp "$OUT" /backup/weekly/
[ $(date +%d) = 01 ] && cp "$OUT" /backup/monthly/
find /backup/weekly -mtime +28 -delete
find /backup/monthly -mtime +365 -delete
```

```bash
sudo chmod +x /usr/local/bin/ispdesk-backup.sh
sudo crontab -e
# Daily 2 AM
0 2 * * * /usr/local/bin/ispdesk-backup.sh >> /var/log/ispdesk-backup.log 2>&1
```

### 4.2 Restore
```bash
# Latest dump থেকে
gunzip -c /backup/daily/db-YYYYMMDD-HHMM.sql.gz | \
  docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
    pg_restore -U postgres -d postgres --clean --if-exists
```

---

## 5. Public Customer Portal (Optional)

### DNS
```
A    admin.yourisp.com    → <your static public IP>
A    portal.yourisp.com   → <your static public IP>
A    api.yourisp.com      → <your static public IP>
```

### Router port-forward
- TCP 80, 443 → server LAN IP (e.g. 192.168.1.10)
- বাকি সব port closed

### Caddy already handles auto-HTTPS (section 3.5)

---

## 6. Security Hardening

```bash
# fail2ban basic (SSH)
sudo systemctl enable --now fail2ban

# Auto security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Postgres — bind to localhost only (default in docker compose)
# Verify:
sudo ss -tlnp | grep 5432
# 127.0.0.1:5432 হতে হবে, 0.0.0.0 না

# Supabase Studio: LAN only
# /opt/supabase/docker/docker-compose.yml — studio service port mapping:
#   "3000:3000"  →  "192.168.1.10:3000:3000"
docker compose up -d

# Strong DB password & rotate JWT_SECRET quarterly
```

### Checklist
- [ ] UFW: শুধু 22/80/443
- [ ] SSH key-only (password disable)
- [ ] fail2ban active
- [ ] Studio LAN-binding
- [ ] Postgres password 32+ chars
- [ ] Backup encryption (rclone crypt remote)
- [ ] HTTPS forced (Caddy default)

---

## 7. Monitoring & Maintenance

```bash
# Logs
docker compose -f /opt/supabase/docker/docker-compose.yml logs -f --tail 100
pm2 logs ispdesk-agent
sudo tail -f /var/log/caddy/access.log

# Disk
df -h
du -sh /opt/supabase/docker/volumes/db/data

# Postgres slow query
docker compose exec db psql -U postgres -c \
  "SELECT calls, total_exec_time/calls AS avg_ms, query
   FROM pg_stat_statements ORDER BY avg_ms DESC LIMIT 10;"
```

### Uptime monitoring (optional)
```bash
docker run -d --restart=always -p 3001:3001 \
  -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
# http://server-ip:3001 — add API, frontend, DB checks
```

---

## 8. Sync with Lovable Cloud Version

যখন Lovable cloud-এ নতুন feature/migration আসে:

```bash
cd /opt/ispdesk
git fetch && git pull

# 1) নতুন migration apply
ls supabase/migrations/ | sort > /tmp/migs-new.txt
# পার্থক্য খুঁজে শুধু নতুনগুলো run করুন
for f in $(comm -23 /tmp/migs-new.txt /tmp/migs-applied.txt); do
  docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
    psql -U postgres -d postgres < "supabase/migrations/$f"
done
cp /tmp/migs-new.txt /tmp/migs-applied.txt

# 2) Edge function redeploy (only changed)
for d in supabase/functions/*/; do
  name=$(basename "$d"); [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name" --no-verify-jwt
done

# 3) Frontend rebuild
npm install
npm run build
sudo rsync -a --delete dist/ /var/www/ispdesk/
```

> **Tip:** `git tag` use করে আগের stable version mark করুন — কিছু ভুল হলে rollback সহজ।

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Frontend → "Failed to fetch" | Wrong `VITE_SUPABASE_URL` / CORS | `.env` check, rebuild, Caddy reload |
| Login → "Invalid JWT" | ANON_KEY ও JWT_SECRET mismatch | Regenerate keys, restart `docker compose` |
| Edge function 500 | Missing secret | `supabase secrets list` → set missing |
| Email not sending | SMTP creds wrong / Gmail App Password not used | Use App Password, port 587 STARTTLS |
| Agent → 401 | api_key wrong / agent disabled in DB | Dashboard → Polling Agents → regenerate |
| Postgres slow | No autovacuum / missing index | `VACUUM ANALYZE`, check pg_stat_user_tables |
| Disk full | Old backups not pruned | Check `/backup/*`, retention script |
| Studio inaccessible | Bound to 0.0.0.0 (intended LAN-only) | SSH tunnel: `ssh -L 3000:localhost:3000 user@server` |
| Let's Encrypt fail | Port 80 blocked / DNS not propagated | `dig admin.yourisp.com`, router port-forward verify |

---

## 10. Quick Reference Checklists

### Pre-install
- [ ] Server hardware ready (8 core / 16 GB / 500 GB SSD)
- [ ] Ubuntu 22.04 LTS installed, updated
- [ ] Static LAN IP + UPS + (optional) public static IP
- [ ] Domain DNS A records set
- [ ] SMTP credentials ready
- [ ] Cloud storage account (S3/Backblaze/Drive) for backups

### Post-install verification
- [ ] `docker compose ps` সব healthy
- [ ] `https://api.yourisp.com/rest/v1/` returns 401 (auth working)
- [ ] `https://admin.yourisp.com` loads ERP login
- [ ] Login works, super-admin can access `/dashboard`
- [ ] `pm2 status` → ispdesk-agent online
- [ ] OLT Inspector dialog → live data দেখাচ্ছে
- [ ] Test backup script manual run → file produced in `/backup/daily/`
- [ ] rclone push successful → cloud-এ file দেখা যায়

### Daily
- [ ] Backup log check: `tail /var/log/ispdesk-backup.log`
- [ ] Uptime-Kuma green

### Weekly
- [ ] Disk usage `df -h`
- [ ] `apt list --upgradable`
- [ ] Postgres slow query review

### Monthly
- [ ] Test restore from backup (dry-run on test machine)
- [ ] Rotate Postgres password / rclone keys
- [ ] Pull latest Lovable cloud changes → apply

### Quarterly
- [ ] Rotate JWT_SECRET + regenerate ANON/SERVICE keys + update frontend `.env`
- [ ] Security audit (open ports, fail2ban logs, user list)

---

## Appendix A — Important File Locations

| Purpose | Path |
|---|---|
| Supabase docker | `/opt/supabase/docker/` |
| Supabase `.env` | `/opt/supabase/docker/.env` |
| Postgres data volume | `/opt/supabase/docker/volumes/db/data/` |
| Storage files | `/opt/supabase/docker/volumes/storage/` |
| ISPDesk repo | `/opt/ispdesk/` |
| Frontend build | `/var/www/ispdesk/` |
| Caddy config | `/etc/caddy/Caddyfile` |
| Caddy certs | `/var/lib/caddy/` |
| Agent | `/opt/ispdesk/agent/` |
| Backups | `/backup/{daily,weekly,monthly}/` |
| Backup script | `/usr/local/bin/ispdesk-backup.sh` |
| Backup log | `/var/log/ispdesk-backup.log` |

## Appendix B — Useful Commands

```bash
# Restart everything
cd /opt/supabase/docker && docker compose restart
sudo systemctl restart caddy
pm2 restart all

# Full stop / start
docker compose down && docker compose up -d

# Postgres shell
docker compose exec db psql -U postgres

# Quick DB size
docker compose exec db psql -U postgres -c \
  "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Edge function logs
docker compose logs -f edge-runtime
```

---

**শেষ কথা:** প্রথমে cloud version stable হোক। তারপর একটা spare PC-তে এই guide step-by-step চালান, ১-২ সপ্তাহ test করুন, সবকিছু verified হলে production-এ migrate করুন। Hybrid pattern-এ cloud-ও থাকবে — DR (disaster recovery) হিসেবে।

কোনো step আটকে গেলে error message সহ জিজ্ঞেস করবেন।
