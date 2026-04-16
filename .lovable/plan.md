

## ৩টি সমস্যা ঠিক করা — MikroTik Toggle, Pay Button, Received By, Offline Clients

---

### 1. MikroTik Toggle — DB Update যোগ

**সমস্যা:** `manage-mikrotik-ppp` edge function MikroTik-এ enable/disable করে কিন্তু `clients.mikrotik_status` DB-তে update করে না। তাই toggle visual state change হয় না।

**সমাধান:** `manage-mikrotik-ppp/index.ts`-এ `enable`, `disable`, `update` action-এর পর Supabase client দিয়ে `clients.mikrotik_status` update করবে:
```
await supabase.from("clients").update({ mikrotik_status: mikrotikStatus }).eq("username", username);
```
Frontend-এ `handleToggleMikrotik`-এ response-এর `mikrotik_status` দিয়ে optimistic update করবে।

### 2. Pay Button — Green Color ও Same Size

**সমাধান:** `BillingList.tsx`-এ Pay button-এর class update:
- Pay: `bg-emerald-500 hover:bg-emerald-600 text-white h-6 text-[10px] px-2`
- Due badge: same `h-6` size
- দুটোই same height ও consistent look

### 3. Received By — Employee/User Dropdown

**সমাধান:** `BillReceiveDialog.tsx`-এ:
- `useAuth()` থেকে current user নেবে
- `profiles` table থেকে employees/users list fetch করবে
- "Received By" dropdown যোগ হবে — default: logged-in user
- Admin হলে সব employee দেখবে ও যেকাউকে assign করতে পারবে
- Non-admin হলে শুধু নিজের নামই দেখবে
- Submit-এ `collected_by` field-এ selected user ID save হবে

### 4. Online Monitoring — Offline Clients ও Filter

**সমাধান:** `OnlineClientMonitoring.tsx`-এ:
- `fetch-mikrotik-ppp` edge function-এর `active-sessions` response-এ already `offline_count` ও `total_clients` আসে
- Offline clients = DB-এর সব clients মাইনাস online sessions (username match)
- নতুন state `offlineClients` যোগ হবে — DB থেকে clients load করে active session-এর username বাদ দেবে
- Online tab-এ "Online" / "Offline" / "All" filter dropdown যোগ হবে
- Offline client row-তে status "Offline" badge দেখাবে, uptime "—" হবে

### Edge Function-এ client_id fallback

`manage-mikrotik-ppp`-এ `client_id` না পেলে `username` দিয়ে client খুঁজে update করবে।

---

### Files

| File | Change |
|------|--------|
| `supabase/functions/manage-mikrotik-ppp/index.ts` | enable/disable/update-এর পর `clients.mikrotik_status` DB update |
| `src/pages/dashboard/billing/BillingList.tsx` | Pay button green, same size as Due |
| `src/components/billing/BillReceiveDialog.tsx` | "Received By" dropdown — employee list + current user default |
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | Offline clients load + Online/Offline filter |
| `src/pages/dashboard/clients/ClientList.tsx` | Toggle-এ optimistic update + DB sync |

