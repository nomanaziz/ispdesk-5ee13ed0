

## চারটি সমস্যার সমাধান

### সমস্যা ১ — District/Upazila নাম দেখা যাচ্ছে না (`—` হ্যাশ)

**কারণ:** `PopAllotedAreas.tsx` সরাসরি Supabase থেকে `pop_district_assignments`, `districts`, `upazilas` query করছে। কিন্তু RLS policy এই tables-এ শুধু `authenticated` role-কে SELECT permission দেয় — POP portal `anon` key দিয়ে চলে, তাই query empty result return করছে → name "—" দেখাচ্ছে। DB-তে Nahid-এর data ঠিকই আছে (Dhaka district + বংশাল upazila assigned)।

**সমাধান:** `portal-data` Edge Function-এ নতুন action `get_pop_allotted_areas` যোগ করবো — service role দিয়ে token-এর `sub` (branch_manager_id) থেকে assignments + district/upazila names fetch করবে। `PopAllotedAreas.tsx` কে `callPortal()` ব্যবহার করতে refactor করবো।

### সমস্যা ২ — Sidebar cleanup

`src/components/ResellerLayout.tsx` এর Monitoring group থেকে:
- ❌ "ক্লায়েন্ট সাপোর্ট" (Client Support) সরাবো
- ❌ "পিং টুলস" (Ping Tools) সরাবো

Monitoring-এ শুধু "অনলাইন ক্লায়েন্ট" থাকবে।

### সমস্যা ৩ — Support Ticketing System sidebar-এ আনা

Route `/pop-admin/tickets` already exists (`ResellerTickets` component কাজ করছে), কিন্তু sidebar-এ সরাসরি কোনো top-level entry নেই। নতুন nav group যোগ করবো:

```
সাপোর্ট টিকেট (Support Tickets) — LifeBuoy icon
  └ /pop-admin/tickets — ক্লায়েন্ট টিকেট
```

`isGroupAllowed`-এ `support` key-ও allow list-এ যোগ করবো।

### সমস্যা ৪ — Header থেকে "Open Website" সরানো

`src/components/ResellerLayout.tsx` line 430-এ `<Link to="/" target="_blank">` Globe button আছে — সেটা মুছে দেবো (mobile shell-এও যদি থাকে check করবো)।

---

### Files যেগুলো edit হবে

| File | পরিবর্তন |
|------|----------|
| `supabase/functions/portal-data/index.ts` | নতুন action `get_pop_allotted_areas` (service-role দিয়ে districts/upazilas/assignments fetch) |
| `src/pages/reseller/config/PopAllotedAreas.tsx` | `callPortal("get_pop_allotted_areas", { mode })` use করবে; direct supabase query সরানো হবে |
| `src/components/ResellerLayout.tsx` | Monitoring থেকে Ping Tools + Client Support সরানো; নতুন "Support Tickets" group যোগ; "Open Website" Globe button সরানো |
| `src/components/reseller/mobile/ResellerMobileShell.tsx` | mobile-এ Globe button থাকলে সরানো |

### প্রতিশ্রুতি

কোনো existing page এর design ভাঙা হবে না — শুধু data fetching path ঠিক করছি, sidebar items reorganize করছি, এবং একটা button সরাচ্ছি।

