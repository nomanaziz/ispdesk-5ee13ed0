# Public QuickPay-এ "কোনো পেমেন্ট পদ্ধতি কনফিগার করা হয়নি" — কারণ ও সমাধান

## কারণ

Admin → System → Payment Gateways-এ ৩টি গেটওয়ে (bKash Personal, Nagad Personal, RechargeServer) ইতিমধ্যেই active + `show_on_website=true` হিসেবে saved। কিন্তু QuickPayDialog সেগুলো পাচ্ছে না কারণ `system_settings` table-এর RLS শুধু `authenticated` users কে SELECT করতে দেয়। Public `/quick-pay` page anon key ব্যবহার করে — তাই খালি array পায়, এবং dialog-এ "কোনো পেমেন্ট পদ্ধতি কনফিগার করা হয়নি" দেখায়।

পুরো `system_settings` anon-কে খুলে দিলে অন্য sensitive setting (SMS gateway secret, internal config ইত্যাদি) leak হতে পারে। তাই sensitive credential strip করা একটা ছোট SECURITY DEFINER RPC তৈরি করব।

## পরিকল্পনা

### 1. Database migration — `public.public_payment_gateways()` RPC

- `SECURITY DEFINER`, `STABLE`, `search_path = public`
- `system_settings` থেকে `payment_gateways` setting পড়ে
- শুধু সেই gateway রিটার্ন করবে যেগুলোর `active = true` এবং `show_on_website = true`
- প্রতিটি gateway থেকে **sensitive field বাদ** দিয়ে দেবে: `app_key`, `app_secret`, `password`, `username`, `secret_key`, `api_key`, `store_password`, `private_key`, `public_key`, `merchant_id`
- safe field রাখবে: `number`, `holder_name`, `instructions`, `bank_name`, `account_name`, `account_number`, `branch`, `routing_number`, `address`, `merchant_number`, `brand_key`, `account`, `sandbox`
- Return type: JSONB (gateway list)
- `GRANT EXECUTE TO anon, authenticated`

### 2. Frontend — `src/components/public/QuickPayDialog.tsx`

- `useSystemSetting("payment_gateways", [])`-এর জায়গায় `useQuery` দিয়ে `supabase.rpc("public_payment_gateways")` call করব
- বাকি rendering / checkout flow অপরিবর্তিত
- Auto-checkout (bKash Merchant / SSLCommerz) সংক্রান্ত branches edge function-এর মাধ্যমে চলে — সেখানে credentials দরকার, কিন্তু সেগুলো secret থেকে edge function নিজেই পায়, dialog থেকে আসে না, তাই কোনো issue নেই

### 3. কোনো RLS policy পরিবর্তন নেই

`system_settings`-এর existing policy অপরিবর্তিত থাকবে — শুধু একটা narrow, sanitized RPC যোগ হবে।

## প্রভাবিত ফাইল

- নতুন migration (`public_payment_gateways` RPC তৈরি)
- `src/components/public/QuickPayDialog.tsx` — gateway fetch পরিবর্তন
