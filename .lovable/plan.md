

## POP Admin — Online Client Monitoring (Admin parity)

### লক্ষ্য
Admin-এর `/dashboard/monitoring/online` (`OnlineClientMonitoring.tsx` — ১৪৫২ লাইনের পূর্ণাঙ্গ module) এর exact same UI ও feature POP portal-এর `/pop-admin/monitoring/online`-এ আনবো — শুধুমাত্র সেই POP-এর নিজের branch-এর client/server/zone-এ scoped। এখন ওইখানে শুধু `PopPlaceholder` বসানো আছে।

### কী কী feature আসবে (admin module থেকে hubohu)

1. **Online / Offline tabs** — DB `is_online` থেকে instant render, পরে live MikroTik sync
2. **Server selector** (mandatory) — শুধু POP-এর tariff-এ assigned MikroTik device গুলো দেখাবে
3. **Zone / Connection-type filter** — শুধু POP-এর branch-এর zone
4. **Search, sort, status filter**
5. **Stats**: Total / Online / Offline / Sync indicator
6. **Per-row actions**:
   - Live Traffic dialog (snapshot polling প্রতি 2s, monthly history, recent logs)
   - Ping tool dialog
   - Single SMS
7. **Bulk SMS** for selected rows
8. **Mismatch tabs** (3টি):
   - System=disabled / MK=enabled
   - System=enabled / MK=disabled
   - Profile mismatch (DB vs MK)
   - Bulk: sync MK→DB or DB→MK
9. **"Sync Online" button** — fetch fresh state from MikroTik
10. **Mobile responsive** — admin-এর মতই collapsible filters

### POP scoping (কোথায় কী filter হবে)

| জিনিস | কীভাবে scope হবে |
|------|------------------|
| Clients query | `.eq("branch_id", branchId).eq("owner_scope","pop")` |
| MikroTik server dropdown | শুধু POP-এর tariff-এ allocated server, অথবা branch-linked devices |
| Zone dropdown | `.eq("branch_id", branchId)` |
| Mismatch records | একই branch filter |
| SMS gateway | POP-এর configured gateway / fallback admin gateway |
| Live traffic / ping | client validation → branch ownership check |

### Architecture

POP portal `anon` key + custom portal token-এ চলে → direct `supabase.from("clients")` RLS-blocked। তাই hybrid approach:

- **Read paths** (clients list, zones, servers, mismatch rows) → `portal-data` edge function-এ নতুন actions, service-role দিয়ে fetch + branch validation
- **Action paths** (sync-online, live-traffic-snapshot, manage-mikrotik-ppp, ping, send SMS) → existing edge functions; POP-mode-এ wrapper edge action হয়ে call হবে যাতে server-side branch ownership verify হয়

### নতুন edge function actions (in `portal-data/index.ts`)

| Action | কাজ |
|--------|-----|
| `pop_monitoring_filters` | servers + zones + connection-types (POP scope) |
| `pop_monitoring_clients` | enabled clients with mikrotik_id + relations |
| `pop_monitoring_sync_online` | proxy → `fetch-mikrotik-ppp` (validate device belongs to POP) |
| `pop_monitoring_active_sessions` | proxy → `fetch-mikrotik-ppp` action `active-sessions` + mismatch (validate device) |
| `pop_live_traffic_snapshot` | proxy → `live-traffic-snapshot` (validate client branch) |
| `pop_ping_client` | proxy → ping logic (validate client branch) |
| `pop_manage_mikrotik_ppp` | proxy → `manage-mikrotik-ppp` (enable/disable/update; validate) |
| `pop_send_sms` | single + bulk SMS to POP's clients |

প্রতিটা action token verify → branch_id resolve → target resource same branch কিনা check → তারপর service-role দিয়ে execute।

### Frontend changes

**নতুন ফাইল**: `src/pages/reseller/PopOnlineMonitoring.tsx`
- Admin `OnlineClientMonitoring.tsx` থেকে structure copy
- সব `supabase.from(...)` call → `callPortal("pop_monitoring_*", ...)`
- সব `supabase.functions.invoke("...")` → `callPortal("pop_*", ...)`
- UI/labels/Bengali text/styling পুরো same রাখা হবে

**App.tsx** edit:
```tsx
// Replace the placeholder
<Route path="/pop-admin/monitoring/online"
  element={<PortalAuthProvider><ResellerProtectedRoute>
    <ResellerLayout><PopOnlineMonitoring /></ResellerLayout>
  </ResellerProtectedRoute></PortalAuthProvider>} />
```

### Files যেগুলো create/edit হবে

| File | কাজ |
|------|-----|
| `src/pages/reseller/PopOnlineMonitoring.tsx` | **নতুন** — admin module-এর POP-scoped clone |
| `src/App.tsx` | placeholder সরিয়ে নতুন page wire-up |
| `supabase/functions/portal-data/index.ts` | উপরের ৮টি নতুন action যোগ |
| Admin `OnlineClientMonitoring.tsx` | **অপরিবর্তিত** |
| Existing edge functions (`fetch-mikrotik-ppp`, `live-traffic-snapshot`, `manage-mikrotik-ppp`) | **অপরিবর্তিত** |

### প্রতিশ্রুতি

- POP admin শুধু **নিজের branch-এর client** দেখবেন, অন্য POP-এর data leak হবে না
- Admin module 100% অপরিবর্তিত — তাই admin-side কিছু ভাঙবে না
- Same UI / Bengali labels / actions / mismatch flow / live traffic / SMS — সব admin-এর মতই
- RLS loosen করা হচ্ছে না — সব POP read/write portal edge function দিয়ে validated

### Technical notes

- DB schema change লাগবে না
- Mobile bottom-tab-এ আগে থেকেই "মনিটর" entry আছে → কাজ করতে শুরু করবে
- POP-এর কোনো MikroTik device assigned না থাকলে empty state friendly message দেখাবে
- `usePopScope()` দিয়ে `isPopMode` detect হবে; non-POP mode-এ এই page render হবে না (route POP-only)

