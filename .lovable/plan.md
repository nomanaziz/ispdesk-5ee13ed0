## কেন এখন ০ user দেখাচ্ছে?

`BulkImport` page শুধু `mikrotik_clients` (DB cache) থেকে পড়ে — **কোনো live sync নেই**। Sync হয় শুধু `/dashboard/mikrotik/import` page-এ। তাই নতুন বানানো MikroTik PPP user (যেদিকে কখনো sync run হয়নি) এই page-এ আসবে না।

DB check-এ দেখা যাচ্ছে: শুধু একটা device-এর ১৭ জন user cached, আর সবগুলোই ইতিমধ্যে `clients` table-এ আছে — তাই "আনম্যাচড ০"। ইউজার-এর নতুন device / নতুন user-এর জন্য কখনো sync হয়নি।

## যা যোগ করব

`BulkImport.tsx`-এর header-এ একটা **toolbar** যেখানে থাকবে:

1. **MikroTik Server selector** (Select dropdown)
   - সব `mikrotik_devices` list থেকে — default = order-এর প্রথমটা।
   - Page প্রথমবার load-এ default device auto-select।

2. **Profile filter** (Select dropdown)
   - Selected server-এর profile list (live `fetch-mikrotik-profiles` থেকে বা cached `mikrotik_clients`-এর distinct profile থেকে)।
   - Default = "All profiles"।

3. **"MikroTik থেকে Sync"** button (`RefreshCw` icon)
   - `supabase.functions.invoke("fetch-mikrotik-ppp", { device_id: selectedDevice })` call করবে — Import.tsx-এর exact pattern।
   - সফল হলে toast + auto re-run `loadUnmatchedUsers()`।

4. **"আনম্যাচড লোড"** button (existing) থাকবে — কিন্তু এখন device + profile filter respect করবে।

## `loadUnmatchedUsers()` পরিবর্তন

- Query-এ filter add: `eq("mikrotik_id", selectedDevice)` + (profile !== "all" হলে) `eq("profile", selectedProfile)`।
- বাকি logic অপরিবর্তিত (exported=false, unmatched-by-username, auto-fill, code-conflict check)।
- Server change বা profile change হলে useEffect দিয়ে auto reload।

## UX Flow

```
[Server: MT-Pop1 ▾]  [Profile: All ▾]  [↻ Sync MikroTik]  [Reload unmatched]
─────────────────────────────────────────────────────────────────────
যদি ০ user → একটা info banner: "এই device-এ কোনো নতুন PPP user নেই।
            নতুন user থাকলে উপরে 'Sync MikroTik' চাপুন।"
```

## Files
- `src/pages/dashboard/mikrotik/BulkImport.tsx` — শুধু এই file। নতুন state (`selectedDevice`, `selectedProfile`, `isSyncing`), toolbar UI, sync handler, query filters।

## Out of Scope
- Multi-device একসাথে sync — একবারে একটা device।
- Excel upload flow পরিবর্তন (অপরিবর্তিত)।
- `fetch-mikrotik-ppp` edge function-এ পরিবর্তন (existing logic ঠিক আছে)।
