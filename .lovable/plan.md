

## Plan: Client List ফিল্টার এবং Online/Offline ইন্ডিকেটর যোগ করা

### Screenshot অনুযায়ী যা যোগ হবে

**1. Filter Panel (Hide/Show টগল সহ)**

Summary cards-এর নিচে একটা collapsible filter section যোগ হবে:
- **Server** — `mikrotik_devices` থেকে dropdown
- **Protocol Type** — `protocol_types` থেকে dropdown
- **Profile** — MikroTik profile (clients-এ unique profile values)
- **Zone** — `zones` থেকে dropdown
- **Sub Zone** — `sub_zones` থেকে dropdown (zone অনুযায়ী ফিল্টার)
- **Box** — `boxes` থেকে dropdown
- **Package** — `isp_packages` থেকে dropdown
- **Client Type** — `client_types` থেকে dropdown
- **Connection Type** — `connection_types_config` থেকে dropdown
- **B.Status** — `billing_statuses` থেকে dropdown
- **M.Status** — enabled/disabled/unknown dropdown
- **Custom Status** — client-এর `status` field
- **From Date / To Date** — created_at range filter

নিচে "Hide ▲" বাটন — ক্লিক করলে filter panel collapse হবে।

**2. Table-এ অতিরিক্ত কলাম (screenshot অনুযায়ী)**

বর্তমান table-এ নিচের কলামগুলো যোগ হবে:
- **Conn. Type** — connection_type
- **Cus. Type** — client_type
- **R.Address** — remote_address
- **MAC Addrs** — mac_address
- **Server** — server_name

**3. ID/IP কলামে Online/Offline ইন্ডিকেটর**

ID/IP সেলে username-এর নিচে ছোট ডট দেখাবে:
- 🟢 **সবুজ ডট** — user online (MikroTik PPP active session আছে)
- ⚫ **ধূসর ডট** — user offline

এই online status `clients` table-এ একটা নতুন `is_online` boolean কলামে সংরক্ষণ হবে। "Sync Clients & Server" বাটন ক্লিক করলে `fetch-mikrotik-ppp` edge function call হবে এবং PPP active connections চেক করে `is_online` আপডেট করবে।

**4. "Sync Clients & Server" বাটন**

Action bar-এ "Sync Clients & Server" বাটন যোগ হবে। এটি:
1. প্রতিটি enabled MikroTik device-এ `/ppp/active/print` চালাবে
2. Active username list পাবে
3. Clients table-এ match করে `is_online = true/false` সেট করবে
4. Page refresh হবে

**5. Entries per page**

Table-র উপরে "SHOW [100] ENTRIES" dropdown যোগ হবে pagination-এর জন্য।

---

### ফাইল পরিবর্তন

| File | Change |
|------|--------|
| **Migration** | `clients` table-এ `is_online` (boolean, default false) কলাম যোগ |
| `src/pages/dashboard/clients/ClientList.tsx` | Filter panel, extra columns, online dot, entries dropdown, Sync button |
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | নতুন action `sync-online` — PPP active connections চেক করে clients-এ `is_online` আপডেট |

### Technical Details

- Filter state: প্রতিটি filter-এর জন্য `useState` — all filters `useMemo`-তে combined apply হবে
- Config data (zones, packages, etc.) `useQuery` দিয়ে load হবে
- Online dot: `c.is_online ? "bg-green-500" : "bg-gray-400"` — 8px rounded circle
- Sync button: `supabase.functions.invoke("fetch-mikrotik-ppp", { body: { action: "sync-online" } })` call করবে, তারপর `queryClient.invalidateQueries`
- Pagination: `filtered.slice(page * perPage, (page+1) * perPage)` pattern

