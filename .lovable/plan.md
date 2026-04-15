

## Plan: Automated Billing Enforcement System

This is the core revenue collection feature — automatically disconnecting clients whose bills are unpaid after their `expire_date`, with configurable cutoff timing, quick date extensions from the client list, VIP exemptions, and periodic re-checks.

### How It Works

```text
┌──────────────────────────────────────────────────────┐
│ Client expire_date passes → Edge Function runs       │
│ (scheduled via pg_cron every 30min/1hr)              │
│                                                      │
│  For each client:                                    │
│   ├─ is_vip = true? → SKIP                          │
│   ├─ billing paid for current month? → SKIP          │
│   ├─ expire_date + grace (cutoff setting) passed?    │
│   │   YES → Call MikroTik API to disable PPP user   │
│   │         Update client mikrotik_status = offline  │
│   └─ NO  → SKIP                                     │
│                                                      │
│  Re-check also catches manually re-enabled users     │
└──────────────────────────────────────────────────────┘
```

### Components

**1. Billing Enforcement Settings (System Setup page)**
Add a new section to `src/pages/dashboard/system/Setup.tsx` with settings stored via `useSystemSetting("billing_enforcement")`:
- **Cutoff Time**: "রাত ১২:০০ AM" / "পরের দিন সকাল ৮:০০ AM" / "পরের দিন দুপুর ১২:০০ PM"
- **Recheck Interval**: 30 min / 1 hour / 2 hours
- **Grace Period (days)**: 0 / 1 / 2 (extra days after expire_date before disconnecting)
- **Enable/Disable toggle**: Master switch for auto-enforcement

**2. Quick Expire Date Extension (Client List UI)**
In `src/pages/dashboard/clients/ClientList.tsx`:
- Add an "Expire" column showing `expire_date` as a clickable badge
- Color-coded: green (>7 days left), yellow (1-7 days), red (expired)
- Clicking opens a Popover with a Calendar datepicker
- Selecting a new date updates `expire_date` in DB instantly
- This is the "quick extension" for clients who ask for a few extra days

**3. Edge Function: `enforce-billing` (NEW)**
`supabase/functions/enforce-billing/index.ts`:
- Reads billing enforcement settings from `system_settings`
- Queries all non-VIP clients where `expire_date < cutoff_time` and current month's billing status is NOT "paid"
- For each expired client:
  - Fetches their MikroTik server credentials via `mikrotik_devices`
  - Calls MikroTik API to disable the PPP secret (set `disabled=yes`)
  - Updates `mikrotik_status = 'offline'` in clients table
- Logs actions for audit trail

**4. Scheduled Cron Job (pg_cron + pg_net)**
- Enable `pg_cron` and `pg_net` extensions
- Schedule the `enforce-billing` function to run at the configured interval (default: every 1 hour)
- The function itself checks the cutoff time setting to decide whether to act

**5. VIP Exemption**
- Already have `is_vip` boolean on clients table
- The enforcement function simply skips any client where `is_vip = true`
- VIP badge visible in client list for easy identification

### Database Changes
- Enable `pg_cron` and `pg_net` extensions (migration)
- No new columns needed — `expire_date`, `is_vip`, `mikrotik_status` already exist

### Files to Create/Edit
| File | Action |
|------|--------|
| `src/pages/dashboard/system/Setup.tsx` | Add billing enforcement settings section |
| `src/pages/dashboard/clients/ClientList.tsx` | Add clickable expire date column with calendar popover |
| `supabase/functions/enforce-billing/index.ts` | NEW — auto-disable expired clients via MikroTik API |
| Migration: enable pg_cron, pg_net | NEW |
| SQL insert: cron.schedule job | NEW (via insert tool, not migration) |

### Technical Details

**MikroTik API call to disable PPP user:**
```text
POST /rest/ppp/secret/set
{ ".id": "*X", "disabled": "yes" }
```
The edge function will use the MikroTik REST API (v7+) or RouterOS API to disable the PPP secret matching the client's `username`.

**Cutoff logic example:**
If `expire_date = 2026-04-15` and setting is "পরের দিন সকাল ৮:০০ AM":
- Enforcement won't act until `2026-04-16 08:00 AM Dhaka time`
- This gives clients overnight to pay

**Quick date extension flow:**
- Client list shows expire dates as colored clickable badges
- Click → Calendar popover → pick new date → instant DB update
- No page reload needed, optimistic UI update

