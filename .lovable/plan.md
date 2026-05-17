এই billing problem fix করার plan:

1. **Paid bill list থেকে সাথে সাথে সরানো**
   - Bill receive করার পর `billing-list` query ঠিকভাবে refresh হবে।
   - যদি user `বকেয়া / অপরিশোধিত / আংশিক / overdue` filter-এ থাকে, payment complete হলে client আর ওই list-এ থাকবে না।
   - Current month-এর paid/due হিসাব current bill থেকে দেখাবে, আর total due আলাদা থাকবে যাতে আগের মাসের due confuse না করে।

2. **পুরো client billing sync ঠিক করা**
   - এখনকার “ক্লায়েন্ট সিঙ্ক” শুধু MikroTik online/offline sync করছে। এটা বদলে এমন করব যাতে sync শেষে billing client list + bill detail refresh হয়।
   - Admin mode-এ query invalidation/refetch হবে: billing list, daily collection, dashboard stats, bill collections।
   - POP mode-এ portal function থেকে returned full client billing data refresh হবে।
   - Sync button text/feedback এমন হবে যাতে বোঝা যায় client billing data refresh হচ্ছে, শুধু MikroTik না।

3. **Payment distribution logic natural করা**
   - এক client-এর একাধিক মাসের due থাকলে টাকা oldest due bill থেকে আগে কাটবে।
   - পুরো টাকা দিলে আগের মাস + current month সব paid হবে, current month-এর paid/due/status ঠিক update হবে।
   - Partial payment হলে যে bill পর্যন্ত টাকা গেছে সেগুলো paid/partial/unpaid হিসেবে update হবে।
   - Bill collection ও income entry amount actual received amount হিসেবেই থাকবে।

4. **Bill receive popup text visibility fix**
   - popup-এর table header (`প্রদেয়`, `ছাড়`, `গৃহীত`, `VAT`, `মোট`, `ব্যালেন্স`) foreground/text color দিয়ে readable করা হবে।
   - Light/dark theme দুই জায়গাতেই যেন white-on-white না হয় সেটা semantic token দিয়ে fix করব।

5. **Same fix admin + POP flow-এ apply**
   - Frontend admin receive dialog update করব।
   - POP portal-এর `receive_pop_bill` edge function-এও same oldest-due payment allocation logic apply করব, কারণ POP reseller panel সেখান দিয়ে bill receive করে।

**Technical files expected:**
- `src/components/billing/BillReceiveDialog.tsx`
- `src/pages/dashboard/billing/BillingList.tsx`
- `src/components/billing/BulkActionButtons.tsx` অথবা sync label ব্যবহারকারী component
- `supabase/functions/portal-data/index.ts`

No schema change needed.