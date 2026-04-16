

## Billing List — M.Online Column Clean Up + Toggle Fix

### পরিবর্তন

**1. C.Code কলামে Online/Offline dot**
- Client ID-এর পাশে ছোট একটা সবুজ/ধূসর dot দেখাবে (online = green, offline = gray)
- কোনো badge বা text নেই, শুধু dot

**2. M.Online → M.Status (Enable/Disable toggle)**
- Column header: "M.Status"
- Online/Offline badge গুলো সম্পূর্ণ remove
- Toggle শুধু MikroTik enabled/disabled দেখাবে (`mikrotik_status` based)
- `pointer-events-none` remove করা হবে — toggle click করলে `manage-mikrotik-ppp` edge function call হবে (enable/disable action)
- Toggle on = enabled, off = disabled

**3. Toggle কাজ করানো**
- `onCheckedChange` handler যোগ — click করলে `manage-mikrotik-ppp` invoke হবে
- Loading state দেখাবে toggle-এ
- Success হলে query invalidate

### File

| File | Change |
|------|--------|
| `src/pages/dashboard/billing/BillingList.tsx` | C.Code-এ online dot, M.Online column-কে functional enable/disable toggle-এ পরিবর্তন |

