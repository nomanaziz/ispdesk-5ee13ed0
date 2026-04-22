

## লক্ষ্য
POP Profile-এর **Exported**, **Unexported** tab-এ admin-এর জন্য reference image-এর মতো **filtering + bulk action toolbar + per-row actions** যোগ করা, এবং একটি নতুন **POP Online Clients** tab যোগ করা।

## ১) Exported Clients tab (image-187 অনুযায়ী)

### Toolbar
- **Bulk Package Change** — select-করা client-এর package change
- **Bulk Profile Change** — MikroTik profile bulk update
- **Bulk Clients Enable** — billing + MT enable
- **Bulk Clients Disable** — billing + MT disable
- **Generate PDF / Generate CSV** export buttons

### Filters (top bar)
- Package (dropdown — POP-এর available packages)
- Server (dropdown — MikroTik servers)
- Protocol (pppoe / static / hotspot)
- Profile (dropdown)
- Search box (right side, existing)
- Show entries (10/25/50/100)

### Table changes
- Left checkbox column (header = select all on page)
- Per-row **B.Status toggle** (billing enable/disable)
- Per-row **M.Status toggle** (MikroTik enable/disable — calls `manage-mikrotik-ppp`)
- বাকি column অপরিবর্তিত

## ২) Unexported Clients tab (image-188 অনুযায়ী)

### Toolbar
- **Clients Bulk Revert** — selected MT user-দের একসাথে revert (loops `revert_mikrotik_client` RPC)
- **Bulk Recharge / Renewal** — selected user-দের package validity extend (admin-side helper; calls existing recharge logic)
- **Bulk Clients Enable**
- **Bulk Clients Disable**
- **Generate PDF / Generate CSV**

### Filters
- Package, Server, Protocol, Profile, **R. Days** (expired / 1-7 / 8-30 / >30)
- Search box, Show entries

### Table changes
- Left checkbox column
- Per-row **Enabled toggle** (MT enable/disable)
- Per-row **Revert button** (existing — অপরিবর্তিত)
- Export column থাকবে না (এটা admin view, MT user-কে আবার client বানানোর জন্য আলাদা flow নেই এখানে — Revert is the inverse)

## ৩) নতুন **POP Online Clients** tab

POP Profile-এর tab list-এ **Online Clients** নামে নতুন tab।

### Top stat strip
- Total Clients
- **Online** (green)
- **Offline** (gray)
- Last sync time

### Filter
- Status: All / Online / Offline
- Search (name / username / IP)

### Table
| Column | Source |
|---|---|
| User ID | `clients.username` |
| Name | `clients.name` |
| Mobile | `clients.contact` |
| Package | `isp_packages.name` |
| IP | `clients.remote_address` |
| Server | `clients.server_name` |
| Uptime | live snapshot (optional, blank if N/A) |
| Status | green "Online" badge / gray "Offline" |

Source query: `clients` where `branch_id = pop.branch_id` AND `owner_scope = 'pop'`, joined with `isp_packages`. `is_online` field দিয়ে status।

Auto-refresh every 30s (lightweight `useQuery` with `refetchInterval`).

## ৪) Bulk action implementation details

| Action | Backend |
|---|---|
| Bulk Enable / Disable (billing) | `clients` table update `billing_status` |
| Bulk Enable / Disable (MikroTik) | loop `manage-mikrotik-ppp` invoke per client |
| Bulk Package Change | `clients.package_id` update + `manage-mikrotik-ppp` profile update |
| Bulk Profile Change | `manage-mikrotik-ppp` profile update only |
| Bulk Revert | loop `revert_mikrotik_client` RPC per MT id |
| Bulk Recharge / Renewal | `clients.expire_date` extend by package validity_days |
| Generate PDF / CSV | client-side using existing libs (jsPDF/papaparse) |

সব bulk action confirmation dialog-এর পরে চলবে এবং progress toast দেখাবে। শেষে relevant query-গুলো invalidate হবে।

## ৫) UI pattern
Reference image-এর মতো একটা reusable **`<BulkActionBar>`** component বানানো হবে যা ৩ জায়গাতেই use হবে — pill-shaped dark buttons + right-side export buttons, top filter row card-এর ভেতর।

## কোন file বদলাবে
- `src/components/branches/PopExportedClients.tsx` — toolbar + filters + bulk + checkboxes + per-row toggle
- `src/components/branches/PopUnexportedClients.tsx` — toolbar + filters + bulk + checkboxes + per-row enable toggle
- `src/components/branches/PopOnlineClients.tsx` *(new)* — Online clients tab
- `src/components/branches/BulkActionBar.tsx` *(new, reusable)*
- `src/pages/dashboard/branches/PopProfile.tsx` — add `Online Clients` tab
- `src/lib/exporters.ts` *(new, small)* — CSV + PDF helpers (if not already present)

## কোন file বদলাবে না
- DB schema, RLS, `manage-mikrotik-ppp` edge function, `revert_mikrotik_client` RPC, Import page

## Apply-এর পরে expected ফলাফল
1. Exported tab-এ admin filter + bulk enable/disable/package/profile change + CSV/PDF export পাবে
2. Unexported tab-এ bulk revert / bulk recharge / bulk enable/disable পাবে, প্রতিটা row-এ enable toggle থাকবে
3. নতুন **Online Clients** tab POP-এর live online/offline client list দেখাবে, auto-refresh সহ
4. Reference image-এর pill-shaped action button look match করবে

