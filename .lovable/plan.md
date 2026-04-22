

## আপনার সমস্যা ও সমাধান

আপনি ১০০% ঠিক বলেছেন — আমি ভুল করেছি। আগের সুন্দর Client List design টা replace করে একটা সাধারণ table বানিয়ে ফেলেছিলাম। সেটা ফেরত আনছি, আর আপনার বাকি ৩টা request ও একসাথে fix করছি।

### সমস্যাগুলো কী কী

1. **Client তালিকার design ভেঙে গেছে** — `/pop-admin/clients` route এখন `PopClientList` নামের একটা plain table দেখাচ্ছে (border, badge, কোনো filter/bulk action নেই)। আগে এটা `ClientList` (dashboard এর full-featured page) দেখাতো — সেটাতে password show/hide, expire date pick, BillingFilterPanel, Bulk actions, Export সব ছিল।
2. **Billing তালিকায় নতুন client নেই** — আসল `BillingList` page তে `gt("monthly_bill", 0)` filter আছে। নতুন quick-create client এ `monthly_bill` set হচ্ছে না (০ থাকছে), তাই billing তালিকায় আসছে না।
3. **Logout উপরে নেই** — Sidebar এর নিচের কোনায় আছে। আপনি চাচ্ছেন user avatar এ click করলে dropdown থেকে logout হবে।
4. **POP type (Prepaid/Postpaid) header এ দেখা যায় না** — `branch_managers.pop_type` field থেকে এটা fetch করে header এ badge হিসেবে দেখাতে হবে।

### Plan

**Step 1 — Client তালিকার আগের design ফেরত আনা**
- `src/App.tsx` এ `/pop-admin/clients` route কে আবার `<ClientList />` (dashboard এর version) এ ফেরত পাঠাবো।
- `ClientList.tsx` already POP-aware (`usePopScope` use করে `branch_id` দিয়ে filter করে) — তাই POP admin এর জন্য শুধু সেই POP এর client ই দেখাবে।
- নতুন তৈরি `PopClientList.tsx` file টা delete করবো (কাজে লাগবে না)।

**Step 2 — Billing তালিকায় নতুন client দেখানো**
- `QuickCreateClientDialog` এ `monthly_bill` field add করবো (default ০, কিন্তু optional input)। অথবা package select করলে package এর rate auto fill হবে।
- `AddClient` flow ইতিমধ্যে `monthly_bill` save করে — সেটার change লাগবে না।
- Billing query invalidation ঠিক করবো যাতে নতুন client সাথে সাথে list এ আসে।

**Step 3 — Logout কে top-right user dropdown এ আনা**
- `ResellerLayout.tsx` desktop header এ avatar (`{customer?.name?.[0]}`) এর উপর `DropdownMenu` wrap করবো।
- Dropdown items: User name + username, **POP Type badge (Prepaid/Postpaid)**, Settings link, Logout button.
- Sidebar এর নিচের logout button টা সরিয়ে দিবো (duplicate এড়াতে)।
- Mobile shell এও একই ভাবে avatar dropdown এ logout আনবো।

**Step 4 — POP Type header এ দেখানো**
- `portal-auth/index.ts` Edge Function এ reseller token issue করার সময় `pop_type` field টাও payload এ যোগ করবো (`branch_managers.pop_type`)।
- `PortalAuthContext` এ `pop_type` expose করবো।
- Header এ POP code এর পাশে একটা badge: 🟢 **Prepaid** / 🟠 **Postpaid**।

### প্রতিশ্রুতি Design এর ব্যাপারে

আমি বুঝতে পেরেছি আপনার design খুব important। **কোনো existing page এর design replace করবো না** — শুধু route এর mapping ঠিক করবো এবং ছোট addition (dropdown + badge) করবো। আপনার পুরো দেখতে ক্লায়েন্ট তালিকা / বিলিং তালিকা / dashboard সব **আগের মতই থাকবে**।

### Files যেগুলো edit হবে

- `src/App.tsx` — route কে original `ClientList` এ ফেরত
- `src/components/ResellerLayout.tsx` — avatar dropdown (logout + POP type badge), sidebar logout সরানো
- `src/components/reseller/mobile/ResellerMobileShell.tsx` — mobile avatar dropdown
- `src/components/QuickCreateClientDialog.tsx` — `monthly_bill` field add
- `supabase/functions/portal-auth/index.ts` — token এ `pop_type` যোগ
- `src/contexts/PortalAuthContext.tsx` — `pop_type` expose
- **Delete:** `src/pages/reseller/clients/PopClientList.tsx` (use হবে না)

