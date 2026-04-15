

## Plan: M.Status কলামে MikroTik PPP Secret স্ট্যাটাস দেখানো

### সমস্যা
বর্তমানে `M.Status` কলামে `mikrotik_status` ফিল্ড দেখায় যা device online/offline status। ইউজার চায় এটি MikroTik PPP secret-এর enabled/disabled status দেখাক:
- **Enabled** (সবুজ) — MikroTik-এ PPP secret enabled আছে
- **Disabled** (লাল) — MikroTik-এ PPP secret disabled আছে
- **Unknown** (ধূসর) — MikroTik ডাটা নেই বা চেক করা হয়নি

### পরিকল্পনা

**1. `mikrotik_status` ফিল্ডে সঠিক মান সংরক্ষণ**
- Client create/update করার সময় `manage-mikrotik-ppp` থেকে response অনুযায়ী `mikrotik_status` সেট করা হবে: `enabled`, `disabled`, বা `unknown`
- `AddClient.tsx`-এ MikroTik fire-and-forget callback-এ সফল হলে DB-তে `mikrotik_status` আপডেট করা হবে

**2. ClientList.tsx-এ M.Status Badge আপডেট**
- `enabled` → সবুজ badge
- `disabled` → লাল badge  
- অন্যথায় → ধূসর "Unknown" badge

**3. `manage-mikrotik-ppp`-তে status return করা**
- `enable` action → response-এ `mikrotik_status: "enabled"` 
- `disable` action → `mikrotik_status: "disabled"`
- `update` action → disabled param অনুযায়ী status return

### ফাইল
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/ClientList.tsx` | M.Status badge-এ enabled/disabled/unknown দেখানো |
| `src/pages/dashboard/clients/AddClient.tsx` | MikroTik callback-এ সফল হলে `mikrotik_status` DB-তে আপডেট |
| `supabase/functions/manage-mikrotik-ppp/index.ts` | Response-এ `mikrotik_status` field return করা |

