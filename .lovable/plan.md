

## লক্ষ্য
Reseller package page-এ logic/terminology নিশ্চিত করা — যাতে reseller-এর **SellingRate** (সে যেটা edit করছে) automatic ভাবে তার client-এর ID create করার সময় package rate হিসেবে চলে আসে।

## বর্তমান state (audit)

✅ Schema ঠিকই আছে:
- `buy_rate` = admin-এর selling price → reseller-এর কাছে এটাই **BuyingRate** (locked)
- `selling_rate` = reseller-এর selling price → তার client-এর কাছে যাবে (editable)

✅ UI column order ঠিক: `Profile | BuyingRate | SellingRate | ValidityDays | Min R.Days | Action`

✅ Edit flow ঠিক: শুধু SellingRate editable, BuyingRate locked, validation `selling >= buy`

❓ **যা missing/uncertain** — যখন reseller (POP admin) তার client-এর জন্য নতুন connection/ID create করে এবং একটা package select করে, তখন price field-এ automatic ভাবে এই `selling_rate` আসছে কি না।

## যা check করতে হবে (read-only inspection)

1. `src/pages/reseller/clients/PopAddClient.tsx` — package select করলে কোন rate auto-fill হচ্ছে?
2. `src/pages/reseller/clients/PopBillingClient.tsx` — billing-এ কোন rate ব্যবহার হচ্ছে?
3. `portal-data` edge function-এর client create/billing actions — `monthly_bill` field কোথা থেকে set হচ্ছে?

## সম্ভাব্য পরিবর্তন

যদি দেখা যায় reseller-এর client create flow-এ admin-এর `isp_packages.price` (অথবা `buy_rate`) auto-fill হচ্ছে selling-এর জায়গায়, তাহলে fix:

- Package select করলে `reseller_tariff_packages.selling_rate` lookup করে `monthly_bill`-এ বসাবে
- যদি reseller সেই package-এর জন্য SellingRate set না করে থাকে (`selling_rate = 0`), তাহলে warning + form block

Edge function action যেমন: `get_tariff_selling_rate(package_id)` → returns reseller's own `selling_rate` for that package, যেটা client form auto-fill-এ call করবে।

## যা **বদলাবে না**
- Package page-এর design (তুমি বলেছো design change চাও না)
- Column order, table layout, edit UX
- Backend `update_tariff_selling_rate` validation

## Files (potentially)
- **Inspect**: `src/pages/reseller/clients/PopAddClient.tsx`, `PopBillingClient.tsx`, `portal-data/index.ts`
- **Modify** (after inspection): client create form auto-fill logic + possibly new portal action

## পরবর্তী step
Approve করলে আমি default mode-এ গিয়ে প্রথমে উপরের file-গুলো পড়ব, তারপর exact fix apply করব। কোনো design/column change হবে না — শুধু client create-এর সময় correct rate (reseller's selling_rate) auto-fill নিশ্চিত করব।

