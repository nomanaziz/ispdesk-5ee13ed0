
সমস্যার আসল কারণ:
- `Import From MikroTik` flow-এ `username`, `password`, `mikrotik_id` আগে থেকেই `AddClient` page-এ আসে।
- কিন্তু `AddClient.tsx` create mode-এ সবসময় `create-mikrotik-ppp` call করে।
- `create-mikrotik-ppp` এখন সরাসরি `/ppp/secret/add` চালায়, আগে check করে না secret আগে থেকেই আছে কি না।
- তাই imported user `aftabnogor_office` MikroTik-এ আগেই থাকলে `"secret with the same name already exists"` error আসে।

যা fix করা হবে:
1. `create-mikrotik-ppp`-কে idempotent করা
   - আগে username দিয়ে MikroTik-এ existing PPP secret খুঁজবে।
   - secret থাকলে আর create করবে না।
   - success return করবে: existing secret পাওয়া গেছে, কিছু change করা হয়নি।
   - secret না থাকলে তবেই নতুন PPP secret create করবে।

2. Existing ID/password app-এ auto reuse করা
   - existing secret পাওয়া গেলে function response-এ `password`, `profile`, `remote-address`, `mikrotik_status` ফেরত দেবে।
   - `AddClient.tsx` ওই returned data payload-এ merge করে client save করবে।
   - মানে: router-এ যা আছে, app-এ সেটাই save হবে; আলাদা কিছু overwrite হবে না।

3. Create flow-এর password guard ঠিক করা
   - এখন frontend আগে থেকেই `password` না থাকলে block করে।
   - এটা soft করা হবে, যাতে function আগে check করতে পারে secret already আছে কি না।
   - secret থাকলে save হবে।
   - secret না থাকলে এবং password না থাকলে তখনই clear error দেখাবে।

যে ফাইলগুলো বদলাবে:
- `supabase/functions/create-mikrotik-ppp/index.ts`
  - existing secret lookup যোগ
  - query/filter support ঠিক করা (`?name`)
  - existing secret case-এ success response
  - missing secret case-এ only then add
- `src/pages/dashboard/clients/AddClient.tsx`
  - create save flow-এ returned MikroTik data payload-এ merge
  - unconditional password বাধা adjust

Expected result:
- Import from MikroTik user save দিলে duplicate error আর আসবে না।
- Router-এ user আগে থেকেই থাকলে শুধু app client save হবে।
- Router-এ user না থাকলে নতুন PPP secret create হবে।
- Existing PPP credentials কোনো change ছাড়া reuse হবে।

Technical note:
- `manage-mikrotik-ppp` already query-style filtering support করে; `create-mikrotik-ppp`-এও একই behavior আনা হবে।
- DB migration লাগবে না।
- Fix-এর পর 3টা case verify করা হবে:
  1. imported existing user save
  2. brand-new user create
  3. existing secret + password missing fallback
