<final-text>## POP Admin billing status + client view fix plan

### কী ঠিক হবে
1. আংশিক payment হলে status সব জায়গায় `আংশিক` দেখাবে, `পরিশোধিত` না  
2. POP Admin থেকে client view খুললে আর দীর্ঘ load হয়ে `ক্লায়েন্ট পাওয়া যায়নি` দেখাবে না

### আসল সমস্যা
- `ClientProfile.tsx` এখনো POP mode-এ সরাসরি `supabase.from("clients")` দিয়ে data তোলে। POP portal `anon` key + custom portal token-এ চলে, তাই এই query RLS-এ block হয়ে profile empty/failed হচ্ছে।
- Billing UI-র কিছু জায়গায় status raw `b.status` থেকে দেখানো হচ্ছে, আবার কিছু জায়গায় `paid/due` থেকে হিসাব করা হচ্ছে। ফলে main admin আর POP/admin view-এর মধ্যে inconsistency হচ্ছে।
- `receive_pop_bill` edge logic-ও admin daily collection logic-এর সঙ্গে পুরোপুরি aligned না; status/due calculation এক জায়গায় raw status-এর ওপর ভর করছে।

### implementation
#### ১) billing status এক জায়গায় normalize করা
একটা shared helper যোগ করা হবে, যেটা bill row থেকে effective status বের করবে:
- `paid` যখন due `<= 0` এবং paid `> 0`
- `partial` যখন paid `> 0` এবং due `> 0`
- `unpaid/due` যখন paid `<= 0` এবং due `> 0`

এই helper use হবে:
- `src/pages/dashboard/billing/BillingList.tsx`
- `src/pages/dashboard/billing/ClientProfile.tsx`
- দরকার হলে `DailyCollection.tsx`-এর status badge / derived UI-তেও

এতে stale `b.status` থাকলেও UI main admin-এর মত consistent দেখাবে:
- `আংশিক` = yellow
- `পরিশোধিত` = green
- `বকেয়া` = red

#### ২) POP bill receive logic main admin-এর সাথে align করা
`supabase/functions/portal-data/index.ts`-এর `receive_pop_bill` action update করা হবে যাতে:
- due/status calculation admin-side logic-এর same rule follow করে
- bill row update, collection insert, income entry insert আগের মতই থাকে
- partial payment হলে persisted status-ও `partial` হয়

এতে future reload-এও status mismatch হবে না।

#### ৩) POP client profile fetch server-side করা
`portal-data` edge function-এ নতুন action যোগ হবে, যেমন:
- `get_pop_client_profile`

এই action:
- portal token থেকে POP identify করবে
- `branch_id` validate করবে
- requested client ওই POP-এর branch-এর কিনা check করবে
- client + billing + bill_collections + needed relations return করবে

প্রয়োজনে একই response-এ basic related data-ও দেওয়া হবে:
- zone / sub-zone / package / box
- bill history
- traffic summary
- change requests / tickets (যতটুকু view page-এ লাগে)

#### ৪) ClientProfile-এ POP branch fetch path আলাদা করা
`src/pages/dashboard/billing/ClientProfile.tsx`-এ:
- admin mode: existing Supabase flow unchanged
- POP mode: `callPortal("get_pop_client_profile", { client_id: id })`
- POP mode-এ RLS-blocked direct queries বন্ধ/disable করা হবে
- empty state আর loading state clean করা হবে যাতে false “ক্লায়েন্ট পাওয়া যায়নি” না দেখায়

#### ৫) same display rule profile page-এও apply করা
`ClientProfile.tsx`-এর:
- sidebar billing badge
- invoice table status badge
- যেকোনো summary status text

সবগুলো shared helper থেকে status নেবে, raw `b.status` থেকে না।

### files likely to change
- `supabase/functions/portal-data/index.ts`
- `src/pages/dashboard/billing/ClientProfile.tsx`
- `src/pages/dashboard/billing/BillingList.tsx`
- সম্ভব হলে একটি shared helper file, যেমন `src/lib/billingStatus.ts`

### ফলাফল
- POP Admin bill partial হলে সব জায়গায় `আংশিক` দেখাবে
- full paid হলে `পরিশোধিত` দেখাবে
- client view POP portal-এ reliably খুলবে
- main admin আর POP admin billing behavior একই rule follow করবে
- security ঠিক থাকবে, কোনো public RLS leak লাগবে না

### technical notes
- DB schema change লাগবে না
- RLS loosen করা হবে না
- POP mode-এর জন্য service-role edge function path ব্যবহার হবে
- `ClientProfile`-এ `.single()`-ভিত্তিক direct POP fetch বাদ দিয়ে portal action-based fetch use হবে যাতে false not-found না আসে</final-text>