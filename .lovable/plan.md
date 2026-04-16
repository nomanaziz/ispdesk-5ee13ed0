

## Billing List — Filter + MikroTik Status Sync Fix

### সমস্যা

1. **Billing list-এ Personal/Free/Inactive client আসছে** — query-তে কোনো filter নেই, সব client fetch হচ্ছে
2. **MikroTik status সঠিক sync হচ্ছে না** — MikroTik-এ disable করা আছে কিন্তু software-এ enable দেখাচ্ছে। Sync Clients বাটন press করলে edge function call হচ্ছে কিন্তু DB-তে সব `mikrotik_status: enabled` রয়ে যাচ্ছে

### পরিবর্তন

#### 1. BillingList.tsx — Query Filter

Supabase query-তে filter যোগ:
- `billing_status` = "Active" only (Personal, Free, Left বাদ)
- `status` = "active" only (inactive বাদ)

```
.eq("status", "active")
.eq("billing_status", "Active")
```

এতে শুধু active + billable client আসবে। Summary cards-ও accurate হবে।

#### 2. Edge Function Debug — `fetch-mikrotik-ppp` sync-online

Edge function-এ console log যোগ করে debug করতে হবে। সম্ভাব্য সমস্যা:
- MikroTik API থেকে `disabled` field-এর value কেমন আসছে (`"true"`, `"yes"`, বা অন্য কিছু)
- Edge function-এ `disabled` field check সঠিক কিনা

Log যোগ করব: কতগুলো secret fetch হলো, কতগুলোর `disabled=true`, কতগুলো status update হলো — এতে debug সহজ হবে।

### Files

| File | Change |
|------|--------|
| `src/pages/dashboard/billing/BillingList.tsx` | Query-তে `.eq("status", "active").eq("billing_status", "Active")` filter যোগ |
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | sync-online action-এ debug logs যোগ — disabled field-এর actual value log করা |

