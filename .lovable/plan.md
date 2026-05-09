## সমস্যা

`pemenট পদ্ধতি বাছাই` থেকে **RechargeServer** ক্লিক করলে error:
> `new row violates row-level security policy for table "public_payment_requests"`

## Root cause

`QuickPayDialog.tsx` insert এর পর `.select("id").single()` করে গেটওয়ে callback URL বানানোর জন্য id লাগে। Anon role-এর জন্য `public_payment_requests` টেবিলে শুধু **INSERT** policy আছে, কোনো **SELECT** policy নেই। তাই `INSERT ... RETURNING` এর returning-row RLS-এ আটকে যায় (Postgres এই কেসে "violates RLS" message দেয়)। যাচাই করলাম — `Prefer: return=minimal` দিয়ে insert সফল হয়, কিন্তু `return=representation` দিয়ে fail করে।

RechargeServer credentials, edge function logic, gateway documentation — সব সঠিক আছে। শুধু এই RLS/return issue blocker।

## Fix plan

**1. Database migration — SECURITY DEFINER RPC**

`public.create_public_payment_request(_client_id uuid, _amount numeric, _method text, _note text)` যা row insert করে এবং নতুন `id` return করে। `SECURITY DEFINER`, `search_path = public`, `GRANT EXECUTE TO anon, authenticated`। ভেতরে validation:

- `_client_id` `clients` টেবিলে exists হতে হবে
- `_amount > 0`
- status hardcoded `'pending'`, trx_id placeholder `'pending-' || extract(epoch from now())`

এতে anon-কে সরাসরি SELECT policy দিতে হবে না, sensitive data leak এর ঝুঁকি থাকে না।

**2. Frontend — `src/components/public/QuickPayDialog.tsx`**

- `startGatewayCheckout` (line 74) এর `supabase.from("public_payment_requests").insert(...).select("id").single()` কে `supabase.rpc("create_public_payment_request", { _client_id, _amount, _method, _note })` দিয়ে replace করা হবে। Return value = new uuid।
- `submit` (line 159) এর manual Trx-ID flow-এ user-supplied `trx_id`, `sender_number`, `note` থাকে, তাই সেটার জন্য ভিন্ন path: insert চালু রাখব কিন্তু `.select(...)` সরিয়ে `Prefer: return=minimal` (default after removing select) দিব — id দরকার নেই।

**3. কোনো edge function বা RechargeServer credential change নেই** — শুধু RLS-bypass করতে server-side RPC ব্যবহার।

## Technical notes

```text
QuickPayDialog
  ├─ startGatewayCheckout()
  │    └─ rpc('create_public_payment_request', {...}) → uuid
  │         → callback URL = /payment-callback?request_id={uuid}
  │
  └─ submit()  (manual Trx-ID for bKash/Nagad personal)
       └─ insert(...)  // no .select(), id needed না
```

RPC signature:
```
create_public_payment_request(
  _client_id uuid,
  _amount numeric,
  _method text,
  _note text DEFAULT NULL
) RETURNS uuid
```

পরিবর্তনের পর RechargeServer flow পুরোপুরি কাজ করবে: payment_url generate → user redirect → payment-callback verify → bill update → MikroTik auto-enable (আগের loop-এ যোগ করা হয়েছে)।