## Goal

Reference image (Bulk Client Recharge popup + R.Days column with red badge) অনুযায়ী Client List পেজে তিনটা কাজ:

1. **Auto R. column সরাও** — আলাদা কলামের পরিবর্তে C.Code-এর পাশে একটা ছোট icon (sync/refresh symbol) দাও — সবুজ tick (auto on) / লাল cross (auto off), click করলেই toggle হবে।
2. **Bulk Client Recharge button + popup** — image-এর মতো একটা popup, যেখানে selected client দের জন্য একসাথে N দিন recharge হবে (per-day = monthly/30, total দেখাবে, POP balance দেখাবে)।
3. **Remaining Days filter** — Client List-এর filter panel-এ "R.Days" dropdown যোগ করো: Expired, 1 day, 2 days, 3 days, 5 days, 10+ days, 20+ days, 30+ days, 60+ days। Filter করার পর সব select করে bulk recharge করা যাবে।

পাশাপাশি **auto-disable on expire** (auto-recharge OFF হলে expire হলেই MikroTik disable) verify করব — `apply-pop-daily-charges` already করছে যখন wallet < daily, কিন্তু auto_recharge_enabled = false case-এ আলাদা path দরকার।

## Changes

### A) `src/pages/dashboard/clients/ClientList.tsx`

- Header থেকে `<TableHead>Auto R.</TableHead>` (line 417) মুছে দাও।
- Body থেকে Auto R. cell (line 501-514, পুরো `<Switch>` cell) মুছে দাও।
- C.Code cell-এ (line 439-454) Info button-এর পাশে একটা **AutoRechargeIcon** component যোগ করো:
  - `auto_recharge_enabled === true` → green `<RefreshCw />` icon (tooltip: "Auto recharge ON — click to disable")
  - `auto_recharge_enabled === false` → muted/red `<RefreshCwOff />` icon (tooltip: "Auto recharge OFF — client will be disabled on expire")
  - Click → `callPortal("set_client_auto_recharge", { client_ids: [c.id], enabled: !current })` + invalidate query
- TableHeader-এ `colSpan={18}` কে `colSpan={17}` করো (loading/empty rows)।

### B) Bulk Client Recharge — নতুন button + dialog (admin/POP both)

- `src/components/billing/BulkActionButtons.tsx` —
  - নতুন prop: `onBulkClientRecharge?: () => void` এবং `showBulkRecharge?: boolean`
  - Row 2-এর শেষে নতুন **"Bulk Client Recharge"** button (icon: `DollarSign`, color: green) যোগ করো — শুধু POP mode-এ দেখাবে।
- `src/pages/dashboard/clients/ClientList.tsx` —
  - নতুন state `bulkRechargeOpen` এবং `selectedClients` derived list।
  - `<BulkActionButtons>`-এ `showBulkRecharge={isPopMode}` এবং `onBulkClientRecharge={() => setBulkRechargeOpen(true)}` pass করো।
  - বিদ্যমান `BulkClientRechargeDialog` (`src/components/reseller/BulkClientRechargeDialog.tsx`) reuse করব।

### C) `src/components/reseller/BulkClientRechargeDialog.tsx` — reference image-এর সাথে align

বর্তমান dialog-এর UI ঠিকই আছে (Per Day Charge, Selected Clients, POP Balance, Total Creditable Amount, Days input)। শুধু:

- `Avg. Per Day Charge` → "Per Day Charge (avg)" label clarify।
- Insufficient হলে "Days limit exceed! Reduce or recharge first." message reference-এর মতো রাখা (already আছে)।
- Empty state: যদি `clients.length === 0` হলে disabled + warning।
- কোনো backend change নেই — `pop_bulk_recharge_clients` action আগেই বানানো।

### D) Remaining Days filter

- `src/components/billing/BillingFilterPanel.tsx` — নতুন field `remainingDays` যোগ করো (Select dropdown) values: `all | expired | 1 | 2 | 3 | 5 | 10plus | 20plus | 30plus | 60plus`।
- `BillingFilters` interface-এ `remainingDays?: string` যোগ করো এবং `defaultFilters`-এ `"all"` set করো।
- `src/pages/dashboard/clients/ClientList.tsx` — `filtered = useMemo(...)` block-এ remaining-days filter logic যোগ করো:
  - `expire_date` থেকে আজকের তারিখ বাদ দিয়ে `remainingDays` calculate (already করা হচ্ছে likely)।
  - Filter expression: expired (≤0), exact 1/2/3/5, ≥10, ≥20, ≥30, ≥60।

### E) Auto-disable on expire (no auto-recharge)

`supabase/functions/apply-pop-daily-charges/index.ts` — line 55-65 logic:
- বর্তমানে wallet < daily হলেই disable করছে। কিন্তু **auto_recharge_enabled = false** client-দের জন্য আলাদা rule দরকার:
  - Client query-তে `auto_recharge_enabled, expire_date` add করো।
  - Loop-এর শুরুতে: যদি `c.auto_recharge_enabled === false` AND `expire_date <= today` → `toDisable.push(c.id)`, `continue;` (charge না করেই disable, কারণ user চায় না auto কাটতে)।
  - এতে user expire হওয়ার সাথে সাথে MikroTik disable হবে এবং balance reserve থাকবে।

পাশাপাশি disable হলে MikroTik-এও push করতে `manage-mikrotik-ppp` invoke (currently শুধু DB column update — same as existing behaviour)।

## Out of scope

- "Connection Type" কলাম রাখাই থাকবে (এটা নতুন না, original screenshot-এও আছে)।
- Schema change নেই; `auto_recharge_enabled` কলাম already আছে।
- Bulk Auto Recharge ON/OFF buttons (already আছে) থাকবে।

## Files touched

- edit: `src/pages/dashboard/clients/ClientList.tsx`
- edit: `src/components/billing/BulkActionButtons.tsx`
- edit: `src/components/billing/BillingFilterPanel.tsx`
- edit: `src/components/reseller/BulkClientRechargeDialog.tsx` (label tweak only)
- edit: `supabase/functions/apply-pop-daily-charges/index.ts`
