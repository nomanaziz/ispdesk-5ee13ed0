## সমস্যা

Reseller (POP-admin) যখন bKash/SSLCommerz-এ fund recharge cancel করেন, gateway তখন `payment-callback` edge function-কে hit করে। সেখান থেকে user-কে app-এ redirect করার সময় base URL ভুলভাবে তৈরি হচ্ছে:

```ts
const base = APP_URL || `${url.protocol}//${url.host.replace(/\.functions\..*/, ".lovable.app")}`;
```

- `APP_URL` env secret সেট নেই
- Edge function এখন `<ref>.supabase.co` host-এ চলে, `.functions.` substring নেই → regex কিছু replace করে না → host হয়ে যায় `hdrhscfambaswndxqzau.supabase.co`
- Final redirect: `https://hdrhscfambaswndxqzau.supabase.co/pop-admin/fund-history/debit?recharge=failed` → Supabase responds **"requested path is invalid"**

আবার tenant-এর custom subdomain (যেমন কোনো POP নিজস্ব domain ব্যবহার করে) থাকলে hardcoded `.lovable.app` fallback-ও সঠিক জায়গায় ফেরত পাঠাবে না।

## সমাধান

Recharge শুরু হওয়ার সময় browser-এর actual origin store করি, তারপর callback-এ ওটাই ব্যবহার করি।

### 1. Schema migration
`pop_fund_recharges` টেবিলে নতুন column:
- `return_origin TEXT` — initiating browser-এর origin (e.g. `https://abc.ispdesk.lovable.app` বা custom domain)

### 2. Frontend — `FundRechargeDialog.tsx`
`supabase.functions.invoke("pop-fund-recharge", …)` call-এ payload-এ যোগ করি:
```ts
app_origin: window.location.origin
```

### 3. Edge function — `pop-fund-recharge/index.ts`
- Body থেকে `app_origin` পড়ে `pop_fund_recharges` insert-এ `return_origin` হিসেবে সেভ করি
- Header fallback হিসেবে `req.headers.get("origin")` ও store করতে পারি

### 4. Edge function — `payment-callback/index.ts`
Base URL resolution priority:

1. `rec.return_origin` (database থেকে — সবচেয়ে নির্ভরযোগ্য)
2. `APP_URL` env (যদি set থাকে)
3. Request `Origin`/`Referer` header
4. Final fallback: hardcoded লোভেবল preview domain

এতে cancel/fail/success সব ক্ষেত্রেই user যেই app-tenant URL থেকে recharge শুরু করেছিলেন ঠিক সেখানে ফিরে যাবেন (`/pop-admin/fund-history/debit?recharge=cancelled|failed|success`)।

### 5. Status mapping
SSLCommerz cancel → `status=CANCELLED` query parameter → callback-এ `recharge=cancelled` (এখন সবই `failed` হয়ে যায়)। তিনটে স্পষ্ট status pass করব: `success`, `failed`, `cancelled`। UI এ ToastDialog এ এদের separately দেখাব।

## ফাইল পরিবর্তন

- `supabase/migrations/<new>.sql` — `return_origin` column যোগ
- `supabase/functions/pop-fund-recharge/index.ts` — origin capture + save
- `supabase/functions/payment-callback/index.ts` — base URL resolution fix + cancelled status
- `src/components/branches/FundRechargeDialog.tsx` — `app_origin` পাঠাবে
- `src/pages/reseller/PopFundDebitHistory.tsx` — `?recharge=cancelled|failed|success` toast handling

## ব্যবহারকারীর কাছে ফলাফল

Cancel চাপলে আপনাকে সরাসরি **POP-admin → Debit History** পেজে ফিরিয়ে আনা হবে এবং উপরে একটা toast দেখাবে:
- Cancel: "ফান্ড রিচার্জ বাতিল করা হয়েছে"
- Fail: "রিচার্জ ব্যর্থ হয়েছে"
- Success: "ফান্ড সফলভাবে যোগ হয়েছে"
