

## লক্ষ্য
POP package page-এ column order ও terminology ঠিক করা — screenshot/explanation অনুযায়ী।

## সমস্যা
এখন column order ভুল ও design inconsistent। User চাইছে exact এই order:

```
Package Name | Server Name | Protocol Type | Profile | BuyingRate | SellingRate | ValidityDays | Min R.Days | Action
```

- **BuyingRate** = admin যেটায় reseller-এর কাছে বিক্রি করছে (= DB-এর `buy_rate`) → reseller-এর কাছে এটাই কেনা দাম, **locked/read-only**
- **SellingRate** = reseller তার client-এর কাছে যেটায় বিক্রি করবে (= DB-এর `selling_rate`) → **শুধু এটা editable**

Wrong values screenshot-এ ("buying rate পাঁচশ কেন") আসছে কারণ হয়তো mapping উল্টে গেছে বা admin price দেখাচ্ছে।

## পরিবর্তন (`src/pages/reseller/config/PopPackages.tsx`)

### 1. Column order fix
Header sequence ঠিক করা: **Package Name → Server Name → Protocol Type → Profile → BuyingRate → SellingRate → ValidityDays → Min R.Days → Action**

### 2. Data mapping verify ও fix
- `BuyingRate` column = `pkg.buy_rate` (admin sells to this reseller at) — display only, no edit
- `SellingRate` column = `pkg.selling_rate` (reseller sells to client at) — only editable field
- নিশ্চিত করব edge function `get_tariff_packages` থেকে `buy_rate` ও `selling_rate` দুটোই আসছে এবং সঠিকভাবে map হচ্ছে — যদি mapping mismatch থাকে তাহলে field name fix

### 3. Design consistency
- Existing design system (table from `@/components/ui/table` + Badge + Button) ব্যবহার করব — কোনো custom card/colored layout না
- BuyingRate cell: plain text, muted color, lock icon hint
- SellingRate cell: text + small green pencil icon → click করলে inline edit (input + save/cancel)
- Validation: `selling_rate >= buy_rate` (already enforced server-side) — client-side warning
- Footer pagination: existing simple pattern

### 4. Verification (read-only)
implementation-এর আগে edge function `portal-data` action `get_tariff_packages` quickly check করে নেব যাতে field names confirm হয়।

## যা **বদলাবে না**
- Backend (`portal-data` actions, `update_tariff_selling_rate` validation) — intact
- Database schema — intact
- AddClient flow (পূর্বের কাজ যেখানে selling_rate auto-fill হয়) — intact

## Files
- **Inspect first**: `supabase/functions/portal-data/index.ts` (only the `get_tariff_packages` action)
- **Modified**: `src/pages/reseller/config/PopPackages.tsx`

approve করলে inspect → fix apply করব। কোনো backend বা schema change হবে না।

