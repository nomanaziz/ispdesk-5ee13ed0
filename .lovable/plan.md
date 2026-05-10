## Goal
Admin Client List থেকে select করা client(s) কে এক বা একাধিক **Reseller / POP**-এর portal-এ transfer করার option যোগ করা — ঠিক যেমন `TransferToPopDialog` এখন MikroTik staging থেকে করে, কিন্তু এবার live `clients` রো'তে কাজ করবে (admin → POP)। Client-এর existing PPP enabled/disabled state অপরিবর্তিত থাকবে।

## UX Flow
1. Admin **Client List** (`/dashboard/clients/home`) → কয়েকটা client select → bulk toolbar-এ নতুন button **"রিসেলারে ট্রান্সফার"** (`ArrowRightLeft` icon)।
2. Dialog খুলবে — POP (reseller) picker (active resellers, balance সহ — existing pattern)।
3. POP select হলে নিচে একটা **Profile → Package match table** দেখাবে:
   - Selected client-দের `profile` (বা MikroTik profile / current package profile) দিয়ে group করা।
   - প্রতিটা profile-এর জন্য POP-এর `tariff_id`-এর `reseller_tariff_packages` থেকে matching package খোঁজা হবে (cheapest match)।
   - **No match → red row + warning**: "এই POP-এর tariff-এ এই package নেই। আগে user-এর package change করুন বা POP-এর tariff-এ add করুন।"
4. Dialog footer-এ:
   - সবগুলো profile match হলে → **"Transfer"** button enabled।
   - কোনো mismatch থাকলে button disabled + কোন কোন user blocked দেখাবে (collapsible list, existing pattern)।
   - POP balance অপ্রতুল হলে warning (existing pattern)।
5. Confirm করলে DB update + toast: "X জন client [POP name]-এ transfer হয়েছে"।

## Behaviour Details

**State preservation (user-এর core requirement):**
- `clients.mikrotik_status` (enabled/disabled), `status`, `expire_date`, `password`, `username`, `mac_address`, `remote_address` — অপরিবর্তিত থাকবে।
- MikroTik PPP নিজে touch করা হবে না — শুধু DB ownership change।

**Per-client mutation:**
- `owner_scope`: `'admin'` → `'pop'`
- `branch_id`: POP-এর `branch_id`
- `package_id`: matched `reseller_tariff_packages.package_id`
- `monthly_bill`: matched package-এর `selling_rate`
- `mikrotik_id` / `server_name`: matched package-এর `mikrotik_server_id`
- `profile`: matched package-এর `mikrotik_profile` (POP-এর profile name যদি admin-এর থেকে আলাদা হয়)

**Balance debit (existing pattern reuse):**
- POP `fund_started=true` এবং balance যথেষ্ট হলে → `branch_funding` row insert (per-day pro-rata, existing logic)।
- Free mode হলে balance untouched।

**Audit:**
- `clients.transferred_from_admin_at`, `transferred_by` — শুধু audit-এর জন্য (existing schema field থাকলে use করব, না থাকলে `meta` jsonb-এ stash করব; migration লাগবে না)।

## Files

**নতুন:**
- `src/components/clients/TransferClientsToPopDialog.tsx` — `TransferToPopDialog` থেকে adapt করা (mikrotik_clients-এর বদলে clients table-এ work করে)।

**Edit:**
- `src/pages/dashboard/clients/ClientList.tsx` — bulk toolbar-এ button যোগ + dialog mount। শুধু admin mode-এ দেখাবে (`!isPopMode`)।
- `src/components/billing/BulkActionButtons.tsx` (বা যেখানেই BulkActionButtons থাকে) — নতুন `onTransferToPop` prop + button।

## Out of Scope
- Reverse transfer (POP → admin)।
- MikroTik PPP profile sync — user বললে user নিজে আগে MikroTik-এ profile change করে নিবেন।
- Database schema change — সব column ইতিমধ্যে আছে।
- Multi-POP split in one go — একবারে একটাই POP।

## Technical Notes
- Match key: `clients.profile` (lowercase compare) ↔ `reseller_tariff_packages.mikrotik_profile`। যদি `clients.profile` empty হয় তাহলে fallback হিসেবে current package-এর profile lookup করব।
- Duplicate check: target POP-এ already same `username` থাকলে skip + summary count দেখাব (existing pattern)।
- Same POP-এ already-belonging client (অর্থাৎ `branch_id === popBranchId`) select করলে UI warning দিবে।
