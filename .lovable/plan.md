

## লক্ষ্য

Admin Payment Gateways page-এ প্রতিটা gateway-র জন্য **type-specific fields** দেখাব (এক-সাইজ-ফিট-অল API/Secret form বাদ)। আর `QuickPayDialog`-এর hardcoded `PAYMENT_CONFIG` সরিয়ে DB থেকে real data পড়ব।

## পরিবর্তন

### 1. `src/pages/dashboard/system/PaymentGateways.tsx` — restructure

নতুন gateway list (default), প্রত্যেকটার **আলাদা fields**:

| Gateway | Type | Fields |
|---|---|---|
| **bKash Personal** | Mobile (Personal) | Number, Account Holder Name, Instructions |
| **bKash Merchant** | Mobile (Merchant) | Merchant Number, App Key, App Secret, Username, Password |
| **Nagad Personal** | Mobile (Personal) | Number, Account Holder Name, Instructions |
| **Nagad Merchant** | Mobile (Merchant) | Merchant ID, Merchant Number, Public Key, Private Key |
| **Rocket Personal** | Mobile (Personal) | Number, Account Holder Name, Instructions |
| **Bank Transfer** | Bank | Bank Name, Account Name, Account Number, Branch, Routing Number, Address (no API/Secret) |
| **SSLCommerz** | Gateway | Store ID, Store Password, Sandbox toggle |
| **RechargeServer** | Gateway | API Key, Secret Key, Brand Key, Account |

Implementation:
- `Gateway` interface-এ `category: "mobile_personal" | "mobile_merchant" | "bank" | "gateway"` + flexible `fields: Record<string, string>` object
- প্রতি category-র জন্য একটা `renderFields(gw, idx)` function যা শুধু relevant inputs render করবে (icons সহ — `Building2` bank-এ, `Smartphone` mobile-এ, `Key` merchant-এ)
- Default seed array-এ ৮টা gateway থাকবে
- "Show on website" + "Active" toggles আগের মতই

### 2. `src/components/public/QuickPayDialog.tsx` — DB-driven

- Hardcoded `PAYMENT_CONFIG` সরিয়ে `useSystemSetting<Gateway[]>("payment_gateways", [])` দিয়ে fetch
- শুধু `active && show_on_website` gateways list-এ দেখাব
- Method choose করার পর সেই gateway-র `fields` থেকে number/bank info dynamic-ভাবে render
- `Method` type extend করে `rocket_personal`, `bkash_merchant` ইত্যাদি cover

### 3. `supabase/functions/rechargeserver-payment/index.ts`

- Field path adjust: `gw.fields.api_key`, `gw.fields.secret_key`, `gw.fields.brand_key` (যেহেতু schema বদলাচ্ছি)

### 4. Existing data migration

- One-time data upsert (insert tool ব্যবহার করে) — পুরনো `payment_gateways` setting-কে নতুন structure-এ rewrite, default values সহ। যদি admin আগে কিছু save করে থাকেন তাহলে old keys (`api_key`, `secret_key`, `account`) → নতুন `fields.*`-এ map।

## Files

**Edit:**
- `src/pages/dashboard/system/PaymentGateways.tsx` (rewrite — category-based fields)
- `src/components/public/QuickPayDialog.tsx` (DB-driven config)
- `supabase/functions/rechargeserver-payment/index.ts` (field path update)

**Data update:** `system_settings.payment_gateways` row reset (insert tool)

## ফলাফল

- Admin → Payment Gateways: bKash Personal-এ শুধু Number+Holder Name; Bank Transfer-এ Account/Routing/Branch (API field নেই); Merchant gateways-এ proper API fields
- Public QuickPay dialog admin-এর সংরক্ষিত আসল number/bank info দেখাবে
- নতুন payment options যোগ করা সহজ হবে (Rocket Personal এখনই যোগ করা হলো)

