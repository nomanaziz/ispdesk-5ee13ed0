# Quick Pay সার্চ ঠিক করা

## সমস্যা

Public site-এর `/quick-pay` (বিল পরিশোধ) page থেকে গ্রাহক ID দিয়ে search করলে "গ্রাহক পাওয়া যায়নি" আসছে — যদিও গ্রাহক database-এ আছে।

## কারণ

সাম্প্রতিক security hardening-এ `clients` এবং `billing` table-এর RLS policy-তে SELECT সীমিত করা হয়েছে শুধু `authenticated` users-এর জন্য (admin বা একই branch-এর staff)। কিন্তু QuickPay page public — anon key ব্যবহার করে — তাই কোনো row রিটার্ন হয় না, এবং UI সেটাকে "not found" হিসেবে দেখায়।

পুরোনো "Authenticated can view clients" policy বদলে শুধু branch-scoped করায় anon access সম্পূর্ণ বন্ধ হয়ে গেছে।

## সমাধানের পরিকল্পনা

Anon access আবার পুরোপুরি খুলে দিলে security regression হবে। তাই দু'টি `SECURITY DEFINER` RPC তৈরি করব যা শুধু **নির্দিষ্ট minimal field** রিটার্ন করে (sensitive data যেমন address, NID, parent details exposed হবে না):

### 1. Database migration

- `public.public_lookup_client(_q text)` — anon + authenticated execute করতে পারবে
  - Match logic: `client_id ILIKE _q` OR `username ILIKE _q` OR `contact = _q` OR (length(_q) ≥ 4 AND `name ILIKE %_q%`)
  - শুধু **এক row** রিটার্ন: `id, name, client_id, contact_masked, monthly_bill, status`
  - `contact_masked`: শেষ ৩ digit ছাড়া বাকিগুলো `*` দিয়ে replace
  - Empty বা < 3 char query reject

- `public.public_lookup_bills(_client_id uuid)` — anon + authenticated execute
  - শেষ ১২ মাসের billing row রিটার্ন: `id, month, amount, paid, due, status`

- `GRANT EXECUTE ... TO anon, authenticated` দু'টোতেই
- `search_path = public` set করা থাকবে

### 2. Frontend: `src/pages/public/QuickPay.tsx`

- বর্তমান চারটা `supabase.from("clients").ilike(...)` query সরিয়ে একটা `supabase.rpc("public_lookup_client", { _q: q })` call
- Bills fetch-ও `supabase.rpc("public_lookup_bills", { _client_id: clientData.id })` দিয়ে replace
- বাকি UI/state logic অপরিবর্তিত

### 3. কোনো ফাইল delete বা অন্য page-এ পরিবর্তন নেই

QuickPayDialog-এ যেহেতু payment submit হয় (insert into payments), সেটার RLS আলাদা — এই plan-এ touch করছি না; problem থাকলে আলাদাভাবে দেখব।

## প্রভাবিত ফাইল

- নতুন migration (clients + billing public lookup RPC)
- `src/pages/public/QuickPay.tsx` — search ও bill fetch দুটো call rewrite
