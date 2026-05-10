## Goal
POP/Reseller "Fund Recharge" এখন শুধু bKash দেখায়। Admin-এর configured সব auto-payment gateway (bKash, SSLCommerz, RechargeServer, Nagad — public site/QuickPay যেগুলো ব্যবহার করে) এই dialog-এও দেখাবে, এবং POP নিজে যেকোনোটি দিয়ে fund add করতে পারবে।

## What changes

### 1) `FundRechargeDialog.tsx` — gateway picker
- বর্তমানে hardcoded "Pay Using bKash" button। Replace করে `public_payment_gateways` RPC থেকে gateways লোড — same source QuickPayDialog ব্যবহার করে, তাই admin "Show on website / Active" toggle যা set করে রাখে সেটাই follow হবে।
- শুধুমাত্র **auto** gateway দেখাবে (`category === "gateway" || category === "mobile_merchant"`)। Manual bank/personal Send Money বাদ — কারণ এটা self-service auto-recharge dialog (admin কে ledger reconcile করার দরকার নেই)।
- Amount input + gateway list cards (icon + name + brand color)। Click করলে সরাসরি সেই gateway-এর checkout শুরু।

### 2) `pop-fund-recharge` edge function — multi-gateway
বর্তমানে শুধু `gateway === "bkash"` handle করে। Extend:
- **bkash** — already works, রাখি।
- **sslcommerz** — `sslcommerz-payment` invoke (action: create), `success/fail/cancel_url` callback-এ `pop_recharge_id` সহ পাঠাব। Response থেকে `GatewayPageURL` ফেরত।
- **rechargeserver** — `rechargeserver-payment` invoke, `payment_url` ফেরত।
- **nagad** — `nagad-payment` invoke, redirect URL ফেরত (key configured না থাকলে clear error)।
- প্রতিটি gateway-এর `gateway_payment_id` / `gateway_response` `pop_fund_recharges` row-এ store হবে।

### 3) `payment-callback` — pop recharge verify সম্প্রসারণ
লাইন 56-67-এ এখন শুধু `gateway === "bkash"` verify হয়। Same gateway-set-এর জন্য `pop_recharge_id` branch-এ verify path যোগ:
- **sslcommerz** → `sslcommerz-payment` validate → `bank_tran_id`/`tran_id` capture।
- **rechargeserver** → `rechargeserver-payment` verify → status check।
- **nagad** → `nagad-payment` verify।
সফল হলে আগের মতই `branch_funding` insert (trigger POP balance credit করবে) → `pop_fund_recharges.status = approved`, `payment_method = gateway`, `trx_id` save।

### 4) Empty/missing-config UX
- যদি কোনো auto gateway active না থাকে → dialog-এ message: "Admin এখনো কোনো online gateway active করেননি — সরাসরি admin-এর সাথে যোগাযোগ করুন"।
- Gateway start fail হলে retry button (QuickPay-এর pattern reuse)।

## Files touched

| File | Change |
|---|---|
| `src/components/branches/FundRechargeDialog.tsx` | Full rewrite — fetch gateways, render auto-only cards, kick off `pop-fund-recharge` with chosen gateway |
| `supabase/functions/pop-fund-recharge/index.ts` | Add sslcommerz / rechargeserver / nagad branches; keep bkash |
| `supabase/functions/payment-callback/index.ts` | Extend `popRechargeId` block to verify sslcommerz / rechargeserver / nagad |

কোনো DB schema বা migration লাগবে না — `pop_fund_recharges` row গুলো পুরনো columns-ই ব্যবহার করে।

## Validation plan
- POP portal থেকে dialog খুলে gateway list দেখা — admin-এর configured visible-on-website + active gateway-গুলোই আসছে কি না।
- bKash sandbox flow → success → POP balance credit + `pop_fund_recharges` approved।
- SSLCommerz/RechargeServer flow same (যদি admin keys configured থাকে; না থাকলে error gracefully দেখাবে)।
- Edge function logs check।