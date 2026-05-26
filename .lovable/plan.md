# Plan: Self-Hosting Documentation (Hybrid Pattern)

## লক্ষ্য
একটা সম্পূর্ণ markdown documentation file তৈরি করব যেটা future-এ আপনি ব্যবহার করে local server-এ পুরো ISPDesk stack install করতে পারবেন। কোনো code change হবে না — শুধু documentation।

## যে file তৈরি হবে

**`docs/SELF_HOSTING.md`** (Bangla + English mixed, ~600-800 lines)

## Document Structure

### Section 1 — Overview
- কী কী component আছে (Frontend, Postgres, Auth, Edge Functions, Storage, Polling Agent)
- Hybrid pattern diagram (ASCII): Local primary ← nightly backup → Cloud
- Data flow: customer portal (public via Caddy) ↔ ERP (LAN) ↔ OLT/MikroTik (LAN)

### Section 2 — Hardware & OS Requirement
- Minimum/Recommended spec table
- Ubuntu 22.04 LTS setup
- Network: static LAN IP, UPS, dual ISP recommendation
- Firewall/UFW base rules

### Section 3 — Step-by-Step Installation

**3.1 Server Bootstrap**
- apt update, docker install, user permission, fail2ban, ufw

**3.2 Self-hosted Supabase (Docker Compose)**
- `git clone supabase/supabase`
- `.env` configure: POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, SMTP
- Generate JWT keys (script সহ)
- `docker compose up -d`
- Studio access (port 8000)
- Verify each service: gotrue, postgrest, realtime, storage-api, edge-runtime, kong

**3.3 Database Migration**
- সব `supabase/migrations/*.sql` file order-wise apply
- `psql` command examples
- Seed data (roles, default branches, app_vault key)
- Verify with `\dt public.*`

**3.4 Edge Functions Deploy**
- Supabase CLI install
- `supabase functions deploy <name>` — সব ৬০+ function list
- Secret configure: LOVABLE_API_KEY (যদি AI feature use করেন), SMTP, Telegram bot token, payment gateway keys

**3.5 Frontend Build**
- `.env` update: VITE_SUPABASE_URL=http://server-ip:8000
- `npm install && npm run build`
- Nginx config example (`/etc/nginx/sites-available/ispdesk`)
- SPA fallback rule (try_files)
- gzip + cache headers

**3.6 Polling Agent**
- Same server-এ pm2 দিয়ে
- `config.json` local Supabase URL
- Multiple agents যদি multiple branch থাকে

### Section 4 — Hybrid Backup Setup
- **Nightly pg_dump** cron job
- Compressed dump → `/backup/` local + rsync to cloud (S3/Backblaze/Google Drive)
- Sample script: `pg_dump | gzip | aws s3 cp - s3://...`
- Restore procedure
- Storage bucket sync (MinIO ↔ cloud)
- Retention policy (7 daily, 4 weekly, 12 monthly)

### Section 5 — Public Customer Portal (Optional)
- Caddy reverse proxy install
- `Caddyfile` example with auto Let's Encrypt SSL
- Domain DNS A record → static IP
- Port 80/443 forward from router
- Subdomain split: `portal.yourisp.com` → frontend, `api.yourisp.com` → Supabase API

### Section 6 — Security Hardening
- UFW rules (allow 80/443/22, deny rest)
- fail2ban for SSH
- Postgres strong password, pg_hba.conf restrict
- Disable Supabase Studio public access (LAN only)
- HTTPS everywhere
- Daily security update cron

### Section 7 — Monitoring & Maintenance
- `docker compose logs` quick reference
- Disk space alert
- pg_stat queries for slow query
- Uptime check (uptime-kuma container suggestion)
- Update procedure: git pull → new migrations → rebuild frontend

### Section 8 — Sync with Lovable Cloud Version
- কীভাবে Lovable cloud-এ যে নতুন feature আসে সেগুলো local-এ আনবেন
- Git workflow: clone Lovable repo → pull → apply new migrations → redeploy edge functions → rebuild frontend
- Schema diff tool suggestion

### Section 9 — Troubleshooting
- Common issues:
  - JWT mismatch
  - Edge function timeout
  - CORS error (Kong config)
  - Email not sending (SMTP)
  - Polling agent reaches local but auth fails
- Each with diagnosis + fix

### Section 10 — Checklist (Quick Reference)
- Pre-install checklist
- Post-install verification checklist
- Daily/weekly/monthly maintenance checklist

## Implementation
Build mode-এ switch হলে শুধু একটা file write হবে: `docs/SELF_HOSTING.md`। কোনো source code, migration, বা edge function change হবে না।
