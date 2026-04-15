

## Plan: Fetch PPP Users from MikroTik into Import List

### Problem
The "ইমপোর্ট ফ্রম মাইক্রোটিক" page reads from `mikrotik_clients` table, but that table is empty — there's no mechanism to actually connect to MikroTik devices and pull PPP secret/user data into it.

### Solution

**1. New Edge Function: `fetch-mikrotik-ppp`**
Create `supabase/functions/fetch-mikrotik-ppp/index.ts` that:
- Accepts `{ device_id }` (or `"all"` to sync all enabled devices)
- Fetches device credentials from `mikrotik_devices`
- Calls MikroTik REST API: `GET /rest/ppp/secret` (v7+) or RouterOS API (v6)
- For each PPP secret returned, upserts into `mikrotik_clients`:
  - `name` = PPP username
  - `password` = PPP password
  - `service` = service type (pppoe/any)
  - `profile` = profile name
  - `caller_id` = caller-id (MAC)
  - `remote_address` = remote-address
  - `mikrotik_id` = device ID
  - `server_name` = device name
  - `user_status` = disabled? "disabled" : "unique"
- Skips PPP users whose `name` already exists in `clients` table (the core filter logic)
- Uses MikroTik REST API with Basic Auth (`username:password` from device record)

**2. Update Import Page UI**
In `src/pages/dashboard/mikrotik/Import.tsx`:
- Add a "সিঙ্ক করুন" (Sync) button at top that calls the edge function
- Show loading state during sync
- After sync completes, refetch `mikrotik_clients` data
- The existing filter (excluding names matching `clients.username`) stays as a second layer of defense

**3. Update `sync-mikrotik-data` Edge Function**
Replace the existing function that only writes to `user_onu_mapping` — redirect it to also populate `mikrotik_clients`, or deprecate it in favor of the new function.

### MikroTik REST API Call
```text
GET https://{ip}:{api_port}/rest/ppp/secret
Authorization: Basic base64(username:password)

Response: Array of PPP secrets with fields:
  .id, name, password, service, profile, caller-id, remote-address, disabled
```

### Files
| File | Action |
|------|--------|
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | NEW — fetch PPP secrets from MikroTik REST API |
| `src/pages/dashboard/mikrotik/Import.tsx` | Add Sync button to trigger fetch |

### Flow
```text
User clicks "সিঙ্ক" → Edge Function called
  → For each enabled MikroTik device:
     → GET /rest/ppp/secret (REST API)
     → Filter out usernames already in clients table
     → Upsert remaining into mikrotik_clients
  → UI refreshes → shows only non-client PPP users
```

