

## Client/Billing list-এ POP-এর client না দেখানোর সমাধান

### আসল কারণ (DB confirm করা)

DB-তে ৩টা client ঠিকই আছে Nahid'র POP-এ (`MVP-000001/002/003`, branch `26973cfc-...`)। কিন্তু `clients` table-এর RLS policy:

| Policy | Role | কাজ করে? |
|--------|------|----------|
| `Authenticated can view clients` (SELECT) | `authenticated` | ✅ Admin dashboard-এ |
| `Admins can manage clients` (ALL) | `authenticated` + admin | ✅ |
| **কোনো `anon` SELECT policy নেই** | `anon` | ❌ **POP portal block** |

POP portal Supabase-এ **`anon` key** দিয়ে চলে (PortalAuthContext token JWT, Supabase auth session না)। তাই `ClientList.tsx` এবং `BillingList.tsx`-এর `supabase.from("clients").select(...).eq("branch_id", branchId)` query empty array return করে — list খালি দেখায়, যদিও create সফল হয় (create call `callPortal("create_client")` → service role দিয়ে insert হয়, সেটা RLS bypass করে)।

### সমাধান — Edge Function দিয়ে POP-scoped fetch

POP portal-কে "anon-readable" করে দেওয়া দুটোই বিপজ্জনক (অন্য POP-এর clients leak হবে)। সঠিক pattern হলো admin pages-এর মতই — service-role edge function:

#### ১. `portal-data` edge function-এ ২টা নতুন action

| Action | কাজ |
|--------|-----|
| `list_pop_clients` | token-এর `branch_id` থেকে সব non-left clients (joins: zone, package, mikrotik) |
| `list_pop_billing_clients` | একই কিন্তু `monthly_bill > 0` + month filter |

দুটোই service role দিয়ে query করে `.eq("branch_id", token.branch_id)` apply করে — অন্য POP-এর data কখনোই leak হবে না।

#### ২. `ClientList.tsx` ও `BillingList.tsx` — POP mode হলে edge function call

```ts
// Pseudocode
queryFn: async () => {
  if (isPopMode) {
    const res = await callPortal("list_pop_clients", { /* filters */ });
    return res.rows;
  }
  // existing admin path unchanged
  ...
}
```

Admin path (যেখানে `authenticated` Supabase session আছে) **একদম unchanged** — design/behavior কিছুই ভাঙবে না।

#### ৩. একই pattern: update/disable/enable mutations

POP mode-এ `update_client_expire`, `set_client_mikrotik_status` ইত্যাদি ছোট action edge function-এ যোগ করবো যাতে list থেকে edit-ও কাজ করে। (এই মুহূর্তে শুধু list দেখানোই priority — mutations ২য় ধাপে)।

### Files যেগুলো edit হবে

| File | পরিবর্তন |
|------|----------|
| `supabase/functions/portal-data/index.ts` | নতুন action: `list_pop_clients`, `list_pop_billing_clients` (service role + branch filter from token) |
| `src/pages/dashboard/clients/ClientList.tsx` | `isPopMode` হলে `callPortal("list_pop_clients")` use; admin path unchanged |
| `src/pages/dashboard/billing/BillingList.tsx` | `isPopMode` হলে `callPortal("list_pop_billing_clients", { month })` use; admin path unchanged |

### প্রতিশ্রুতি

- **Admin dashboard-এর design/behavior একদম unchanged** — শুধু POP mode-এ data fetch path আলাদা।
- কোনো RLS policy public করছি না — security tight থাকছে।
- এর পরেই Nahid'র already-created ৩টা client (MVP-000001/002/003) `/pop-admin/clients` এবং `/pop-admin/billing/list`-এ সাথে সাথে দেখা যাবে।

