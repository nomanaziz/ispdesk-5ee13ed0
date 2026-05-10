## রুট কারণ

পেজ দুটি (Debit History, Credit History) আসলে **আগেই বানানো আছে** এবং DB-তে ডেটাও আছে (২টি `branch_funding` row, ৪টি `pop_daily_charges`)। কিন্তু কম্পোনেন্টগুলো `supabase` ক্লায়েন্ট (anon key) দিয়ে সরাসরি REST query করছে। POP user কাস্টম portal JWT দিয়ে লগইন — Supabase `auth.uid()` null। তাই RLS পলিসি (`true` requires authenticated, `is_admin_or_super` requires admin) সব row ফিল্টার করে empty `[]` ফেরত দিচ্ছে।

Network logs-এও স্পষ্ট: `branch_funding?branch_id=eq.26973...` → `[]`, `pop_daily_charges?pop_id=eq.de4cd...` → `[]`।

## সমাধান

সব POP-context query `portal-data` edge function-এর মাধ্যমে চালানো হবে — সেখানে service role দিয়ে token-এর `branch_id`/`reseller_id`-এ স্কোপ করে রো ফেরত দেওয়া হবে। RLS পলিসি অপরিবর্তিত থাকবে।

## পরিবর্তন

### 1. Edge function (`supabase/functions/portal-data/index.ts`) — তিনটি নতুন action

- **`pop_get_debit_history`** — input: `{ from, to }`. Token থেকে `branch_id` বের করে `branch_funding` থেকে date-range query, `funding_date desc, created_at desc` order, limit 2000।
- **`pop_get_credit_history`** — input: `{ from, to }`. Token থেকে reseller `id` (= `pop_id`) ব্যবহার করে `pop_daily_charges` থেকে date-range রো ফেরত (rollup ফ্রন্টএন্ডেই হয়)।
- **`pop_get_credit_detail`** — input: `{ date }`. ঐ একদিনের সব `pop_daily_charges` রো (সব column) ফেরত — detail dialog-এর জন্য।

তিনটিই শুধু `tok.type === "reseller" | "reseller_sub"` allow করবে; `reseller_sub` হলে `parent_reseller_id` ব্যবহার হবে। কোনো ক্লায়েন্ট-supplied id নেওয়া হবে না — token-এই scope।

### 2. Frontend — তিনটি ফাইলে শুধু data fetch পরিবর্তন

- **`src/components/branches/PopDebitHistory.tsx`** — `supabase.from("branch_funding")` কে `callPortal("pop_get_debit_history", { from, to })` দিয়ে replace। UI/columns/totals অপরিবর্তিত।
- **`src/components/branches/PopCreditHistory.tsx`** — `supabase.from("pop_daily_charges")` কে `callPortal("pop_get_credit_history", { from, to })` দিয়ে replace। rollup logic অপরিবর্তিত।
- **`src/components/branches/PopCreditDetailDialog.tsx`** — same: `callPortal("pop_get_credit_detail", { date })`।

কোনো RLS, schema বা UI পরিবর্তন নেই।

## নোট

- Admin context-এ যেখানে `PopDebitHistory`/`PopCreditHistory` ব্যবহার হয় (`/dashboard/branches/...`) — সেগুলো admin-logged-in হলে এখন কাজ করছে কিনা চেক করব; admin শুধু RLS-allowed হওয়ায় তাদের জন্য direct REST ঠিকই কাজ করে। তবে একই কম্পোনেন্ট দুই জায়গায় ব্যবহৃত হলে portal-data fallback issue হতে পারে — যদি admin context-এ কম্পোনেন্ট ব্যবহার হয়, তাহলে একটা `mode` prop দিয়ে দুই branch করব (admin → direct REST, pop → callPortal)। বর্তমান POP page শুধু POP route-এ ব্যবহার, কিন্তু component পুরোপুরি POP-only করার আগে usage check করব।
