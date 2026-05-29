# Phase-3 Plan (Sequential)

১২টা feature ক্রমান্বয়ে। প্রতিটা step = migration (যদি লাগে) + code change + verification।

---

## Order of Execution

### 🧱 Foundation first (অন্য feature এই গুলোর উপর depend করে)

**Step 1 — SMS/Email Automation Engine**
- Tables: `notification_templates` (type, channel, subject, body, variables), `notification_logs` (recipient, status, sent_at)
- Edge function: `send-notification` (SMS via BD provider e.g. SSL Wireless/Banglalink, Email via Resend)
- Template engine with `{{client_name}}`, `{{amount}}`, `{{due_date}}` placeholders
- Settings page: provider config (sender_id, api_key via secrets)
- Used by Step 2, 3, 7, 11

**Step 2 — Bulk Invoice Generator**
- Edge function: `generate-monthly-invoices` (per-tenant, per-package billing cycle)
- Table: `invoice_batches` (batch_id, month, count, total_amount, status)
- UI: `/dashboard/billing/bulk-generate` — month picker, preview, generate, PDF download all
- Auto-trigger SMS via Step 1

**Step 3 — Auto-Suspension Scheduler**
- pg_cron daily job → check overdue invoices > grace_days
- Action: set `clients.status = 'suspended'`, push to MikroTik (disable PPPoE secret), send SMS
- Reactivation: on payment, auto-enable
- Settings: `grace_days`, `suspension_message`, `auto_disconnect_enabled` per tenant

---

### 💰 Payments

**Step 4 — Payment Gateway Integration**
- Providers: bKash (tokenized), Nagad, SSLCommerz (covers Rocket + cards)
- Tables: `payment_gateways` (tenant_id, provider, credentials_encrypted, enabled), `payment_transactions` (gateway, txn_id, amount, status, raw_response)
- Edge functions: `payment-initiate`, `payment-callback`, `payment-verify`
- Client portal "Pay Now" button → gateway redirect → callback → invoice marked paid → SMS receipt
- Settings page: enable gateways, paste merchant credentials

---

### 📱 Customer-facing

**Step 5 — Client Mobile PWA**
- Install `vite-plugin-pwa`, manifest, icons, service worker
- Offline cache for `/portal/*` routes
- Install prompt on `/portal/install`
- Push notifications (optional, Phase later)
- OAuth denylist as per Lovable guidelines

**Step 6 — WhatsApp Business Integration**
- Provider: WhatsApp Cloud API (Meta) — free tier
- Reuse Step 1 notification engine, add `whatsapp` channel
- Templates: bill_reminder, payment_confirm, ticket_update
- Settings: phone_number_id, access_token via secrets

---

### 🛠️ Operations

**Step 7 — Ticket SLA Tracking**
- Extend existing `support_tickets`: add `priority`, `sla_due_at`, `escalated_at`, `resolved_at`
- pg_cron job: SLA breach detection → escalate + notify manager
- UI: SLA badges (green/yellow/red), countdown timer, escalation matrix settings
- Reports: avg resolution time, SLA compliance %

**Step 8 — Bulk Import/Export**
- Generic CSV/Excel importer using `xlsx` (already common)
- Entities: clients, payments, inventory_items, employees
- UI: upload → column mapping → validation preview → commit
- Export: any list page → "Export CSV/Excel" button
- Edge function for large imports (>1000 rows)

**Step 9 — Field Engineer Mobile App**
- Reuse PWA from Step 5
- New role: `field_engineer`
- Tables: `field_jobs` (assignee, client_id, type, scheduled_at, status, location, photos[])
- Mobile UI: today's jobs, GPS check-in (geolocation API), photo upload (Supabase storage), complete with notes
- Manager dashboard: live job map, completion rate

---

### 🌐 Network

**Step 10 — OLT Real-time Alarms**
- Extend polling agent contract: push alarm events to `olt_alarms` table
- Types: ONU offline, signal drop (<-25dBm), high temp, port down
- Real-time UI via Supabase Realtime subscriptions
- Auto-notify (Step 1): branch manager on critical alarms
- Alarm history page with filters

**Step 11 — Bandwidth Usage Monitoring**
- Tables: `bandwidth_samples` (client_id, timestamp, rx_bytes, tx_bytes), `bandwidth_daily` (aggregated)
- Polling agent collects from MikroTik queue stats every 5 min
- UI: per-client live graph (recharts), FUP usage bar, top-10 users
- FUP rule: package `fup_gb` exceeded → throttle speed via MikroTik queue update

---

### 📊 Analytics

**Step 12 — Advanced Reports & Analytics**
- Reports module rebuild: Revenue trend, MRR/ARR, ARPU, churn rate, new vs lost clients
- OLT/POP-wise performance: uptime, ticket count, revenue
- Export: PDF (jspdf) + Excel
- Scheduled email reports (daily/weekly/monthly) using Step 1

---

## Rules
- প্রতি step শেষে আমি update দিব, আপনি verify করবেন
- Migration approve না করলে next step এ যাব না
- BD-specific: টাকা symbol ৳, Bangla labels priority, mobile number +880 validation
- প্রতি tenant এর নিজস্ব config (provider keys, SLA hours, FUP rules)

## Risks
- bKash/Nagad API access — merchant onboarding lাগে, sandbox দিয়ে start
- SMS provider — SSL Wireless / Mobireach সব ISP-friendly
- WhatsApp Cloud API — Meta Business verification লাগে
- Polling agent code update Step 10, 11 এ লাগবে (এটা separate repo)

---

## Start: Step 1 (SMS/Email Automation)

Next: Migration draft করব notification_templates + notification_logs টেবিল এর জন্য, তারপর approve হলে edge function + UI।
