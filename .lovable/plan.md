

## লক্ষ্য

চারটা payment gateway-র **actual API integration** করব — bKash Merchant, Nagad Merchant, SSLCommerz, RechargeServer। প্রতিটার জন্য edge function তৈরি/update করব যাতে hosted checkout flow কাজ করে। Payment success হলে auto bill paid + receipt।

## বর্তমান অবস্থা

- **RechargeServer**: edge function আছে (`rechargeserver-payment/index.ts`) — create + verify কাজ করে
- **bKash/Nagad/SSLCommerz**: কোনো edge function নেই, QuickPayDialog-এ "শীঘ্রই আসছে" toast দেখায়
- Admin PaymentGateways page-এ সব field structure ঠিক আছে (merchant credentials)

## পরিবর্তন

### 1. Edge Functions (নতুন ৩টা)

**`supabase/functions/bkash-payment/index.ts`**
- bKash Tokenized Checkout API (v1.2.0-beta)
- `action: "create"` → Grant Token → Create Payment → return bKash URL
- `action: "execute"` → Execute Payment (callback থেকে paymentID দিয়ে)
- `action: "query"` → Query Payment status
- Sandbox/Production toggle: admin-এর `fields.sandbox` পড়ে base URL switch করবে
  - Sandbox: `https://tokenized.sandbox.bka.sh/v1.2.0-beta`
  - Production: `https://tokenized.pay.bka.sh/v1.2.0-beta`
- Credentials: `fields.app_key`, `fields.app_secret`, `fields.username`, `fields.password`

**`supabase/functions/nagad-payment/index.ts`**
- Nagad Payment Gateway API
- `action: "create"` → Initialize → Complete → return redirect URL
- `action: "verify"` → Verify payment by payment_ref_id
- Credentials: `fields.merchant_id`, `fields.merchant_number`, `fields.public_key`, `fields.private_key`
- Sandbox/Production toggle

**`supabase/functions/sslcommerz-payment/index.ts`**
- SSLCommerz Session API
- `action: "create"` → POST to `/gwprocess/v4/api.php` → return GatewayPageURL
- `action: "validate"` → POST to `/validator/api/validationserverAPI.php`
- Sandbox: `https://sandbox.sslcommerz.com`
- Production: `https://securepay.sslcommerz.com`
- Credentials: `fields.store_id`, `fields.store_password`

### 2. Payment Callback Edge Function (নতুন)

**`supabase/functions/payment-callback/index.ts`**
- সব gateway-র success/fail/cancel callback handle করবে
- URL pattern: `/payment-callback?gateway=bkash&status=success&paymentID=xxx`
- Success flow:
  1. Gateway-specific verify call → confirm paid
  2. `billing` table-এ invoice `status = 'paid'` mark
  3. `bill_collections` table-এ entry (amount, method, trx_id, date)
  4. Redirect to portal invoice page with success message
- Fail/Cancel → redirect with error message

### 3. QuickPayDialog Update

- Gateway/Merchant category click → edge function call → redirect to gateway checkout page
- Personal/Bank → আগের মতোই manual Trx ID submit
- Loading state দেখাবে "Gateway-এ নিয়ে যাচ্ছে..."

### 4. Portal Invoice Page — Payment Return

- URL param `?payment=success` বা `?payment=failed` check
- Success → green toast "পেমেন্ট সফল হয়েছে"
- Failed → red toast "পেমেন্ট ব্যর্থ হয়েছে"

### 5. Admin PaymentGateways.tsx — Sandbox Toggle

- bKash Merchant, Nagad Merchant, SSLCommerz → `sandbox` field যোগ (SSLCommerz-এ আগে থেকেই আছে, বাকি দুটোতে যোগ)
- Toggle UI দেখাবে "Sandbox Mode" switch

## ব্লকার: RechargeServer Documentation

আপনি বলেছেন documentation দেবেন। সেটা পাওয়ার পর RechargeServer-এর flow finalize করব। বর্তমানে যা আছে (create + verify) সেটা ঠিকই কাজ করবে, তবে callback/webhook integration-এর জন্য docs লাগবে।

## Files

**নতুন:**
- `supabase/functions/bkash-payment/index.ts`
- `supabase/functions/nagad-payment/index.ts`
- `supabase/functions/sslcommerz-payment/index.ts`
- `supabase/functions/payment-callback/index.ts`

**Edit:**
- `src/components/public/QuickPayDialog.tsx` — gateway redirect flow
- `src/pages/dashboard/system/PaymentGateways.tsx` — sandbox toggle সব merchant-এ
- `src/pages/portal/PortalBillInvoice.tsx` — payment return handling

**DB Migration:**
- `public_payment_requests` table-এ `gateway_response` jsonb column যোগ (callback data store)

## ফলাফল

- bKash Merchant → admin sandbox toggle ON → "Pay Now" click → bKash checkout page → payment → auto redirect → invoice paid
- Nagad/SSLCommerz → same flow
- RechargeServer → existing flow + callback auto-mark (docs পাওয়ার পর finalize)
- Personal/Bank → আগের মতোই manual Trx ID

