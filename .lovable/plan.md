

## সমস্যা ও সমাধান

### কেন fail করছে?
`inspect-device`, `fetch-device-users`, `process-deploy-job` — তিনটাই **MikroTik REST API** (`http://ip:port/rest/...`) call করছে। কিন্তু:
- AFTABNAGAR device-এর `api_port = 8523` → এটা **native binary API port**, REST না
- REST API আলাদা (port 80/443, www-service enable করতে হয়) — বেশিরভাগ MikroTik routers এ default off
- তাই request টাই reach করে না → "Failed to send a request to the Edge Function" (function crash/timeout)

### "AFTABNAGAR" কোথা থেকে এলো?
এটা আপনার আগেই **Mikrotik → Servers** page থেকে add করা device। `mikrotik_devices` table-এ আছে (IP `103.147.107.13`, user `nafisa`, port `8523`)। Device Admin module এই same table query করে — তাই এক জায়গায় add করলেই সব জায়গায় দেখায়।

Status `online` দেখাচ্ছে কারণ অন্য working function (`check-mikrotik-status` / `fetch-mikrotik-ppp`) **native binary API** দিয়ে successfully connect করতে পারছে port 8523-এ। কিন্তু নতুন Device Admin functions REST ব্যবহার করছে — সেটাই mismatch।

### Fix Plan

**1. সব Device Admin edge function কে native API protocol-এ convert করব** (existing `fetch-mikrotik-ppp`-এর binary protocol pattern ব্যবহার করে)। একটা shared helper module বানাব।

**File:** `supabase/functions/_shared/mikrotik-api.ts` (নতুন)
- `connectMikrotik(host, port, user, pass)` → TCP socket login
- `sendCommand(conn, words[])` → command চালিয়ে rows return
- Reuse করবে: `inspect-device`, `fetch-device-users`, `process-deploy-job`

**2. Update `inspect-device/index.ts`:**
- REST fetch বাদ → native API
- Commands:
  - users → `/user/print`
  - interfaces → `/interface/print`
  - vlans → `/interface/vlan/print`
  - vlan_ips → `/ip/address/print` (filter where interface contains "vlan")

**3. Update `process-deploy-job/index.ts`:**
- REST `PUT /user` বাদ → native `/user/add` (deploy) এবং `/user/remove` (delete)
- এতে job pending না থেকে actually complete হবে

**4. Update `fetch-device-users/index.ts`:**
- Same conversion

**5. UI feedback improvements:**
- `DeviceInspectorDialog`-এ error হলে প্রকৃত cause দেখাবে (timeout / auth fail / port closed)
- Devices page-এ Inspect button-এ tooltip add: "device must be reachable on API port"

**6. একটা Info Card** Devices page-এ ছোট করে দেখাব:
> "এই device গুলো MikroTik → Servers থেকে sync হয়। নতুন non-MikroTik device এই page-এর Add Device button দিয়ে যোগ করুন।"

### কোনো DB migration লাগবে না — শুধু edge functions update।

### Files to edit
- **New:** `supabase/functions/_shared/mikrotik-api.ts`
- **Edit:** `supabase/functions/inspect-device/index.ts`
- **Edit:** `supabase/functions/process-deploy-job/index.ts`
- **Edit:** `supabase/functions/fetch-device-users/index.ts`
- **Edit:** `src/components/device-admin/DeviceInspectorDialog.tsx` (better error UI)
- **Edit:** `src/pages/dashboard/device-admin/Devices.tsx` (info banner)

