

## Billing List — Sync Clients ঠিক করা + MikroTik Status সঠিক sync

### সমস্যা

1. **Sync Clients বাটন কাজ করে না** — `onSyncClients={notImplemented}` দিয়ে রাখা আছে
2. **MikroTik status sync হয় না** — `sync-online` action শুধু `is_online` update করে, `mikrotik_status` (enabled/disabled) sync করে না

### পরিবর্তন

#### 1. Edge Function Update (`supabase/functions/fetch-mikrotik-ppp/index.ts`)

`sync-online` action-এ PPP secrets-ও fetch করে `mikrotik_status` update করবে:
- Active sessions থেকে `is_online` sync (বর্তমানের মতো)
- PPP secrets থেকে `disabled` field পড়ে `mikrotik_status` = "enabled" বা "disabled" DB-তে update করবে
- Client select query-তে `mikrotik_status, mikrotik_id` যোগ হবে

#### 2. BillingList.tsx — Sync Clients handler

`notImplemented` এর বদলে একটি `handleSyncClients` ফাংশন:
- `fetch-mikrotik-ppp` invoke করবে `{ action: "sync-online", device_id: "all" }`
- Loading toast দেখাবে sync চলাকালীন
- Success/error toast + query invalidate

### Files

| File | Change |
|------|--------|
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | `sync-online` action-এ `mikrotik_status` sync যোগ |
| `src/pages/dashboard/billing/BillingList.tsx` | `onSyncClients` handler implement |

