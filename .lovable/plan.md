

## POP Admin Tickets — Client dropdown + ISP category fix

### আসল সমস্যা
1. POP portal `anon` key + custom portal token-এ চলে → `supabase.from("clients")` সরাসরি query RLS-এ block হয়ে dropdown empty থাকছে।
2. New Ticket dialog-এ Category field-ই নাই, common ISP issue presets-ও নাই।

### সমাধান

#### ১) Client list portal API দিয়ে আনা
`supabase/functions/portal-data/index.ts`-এ নতুন action যোগ:
- **`pop_ticket_clients`** → token থেকে POP identify → `branch_id` validate → service-role দিয়ে সেই branch-এর সব client (`id, name, client_id, username, contact, mobile`) return করবে।

`ResellerTickets.tsx`-এ `pop-clients-min` query কে `callPortal("pop_ticket_clients")` দিয়ে replace করবো — RLS bypass হবে, কিন্তু server-side branch ownership enforce থাকবে।

#### ২) Support category dropdown যোগ
`portal-data`-এ আরেকটা action:
- **`pop_ticket_categories`** → `support_categories` table থেকে active categories return করবে (যেগুলো admin আগে সেট করেছে)।

Dialog-এ নতুন Category select field যোগ হবে।

#### ৩) ISP-common preset issues seed করা
Migration দিয়ে কিছু default category insert হবে যদি table-এ না থাকে:
- ইন্টারনেট স্লো (Internet Slow)
- লাইন শিফটিং (Line Shifting)
- ফাইবার কাট (Fiber Cut)
- রাউটার শিফটিং (Router Shifting)
- প্যাকেজ পরিবর্তন (Package Change)
- কানেকশন ডিসকানেক্টেড (No Internet / Disconnected)
- পাসওয়ার্ড পরিবর্তন (Password Change)
- ONU/Device সমস্যা (ONU/Device Issue)
- পেমেন্ট/বিল সমস্যা (Billing Issue)
- নতুন কানেকশন (New Connection Request)

`ON CONFLICT DO NOTHING` দিয়ে — যাতে existing data overwrite না হয়।

#### ৪) Dialog-এ searchable client dropdown
Client সংখ্যা বেশি হলে scroll/search সুবিধা দিতে — Combobox (existing `Command` + `Popover` pattern) ব্যবহার করবো যাতে নাম/client_id/contact দিয়ে instant search করা যায়। সাধারণ Select-ও ঠিক আছে যদি অল্প client থাকে — দুটোর মধ্যে searchable Combobox বেশি usable, সেটাই use করবো।

#### ৫) Insert-ও portal API দিয়ে (security)
নতুন action:
- **`pop_create_ticket`** → POP-এর branch-এর client কিনা verify → ticket + initial message insert → `category_id`, `client_id`, `subject`, `description`, `priority`, `source: pop_admin` set।

ফলে কেউ অন্য POP-এর `client_id` দিয়ে ticket তৈরি করতে পারবে না।

### Files যেগুলো create/edit হবে

| File | কাজ |
|------|-----|
| `supabase/functions/portal-data/index.ts` | ৩টি নতুন action: `pop_ticket_clients`, `pop_ticket_categories`, `pop_create_ticket` |
| `src/pages/reseller/ResellerTickets.tsx` | clients/categories `callPortal` দিয়ে fetch, Combobox client picker, Category select, ticket create-ও portal API দিয়ে |
| Migration | Default ISP categories seed (existing থাকলে skip) |

### ফলাফল
- New Ticket → Client dropdown-এ POP-এর সব client list আসবে, search করা যাবে
- Category select-এ Internet Slow / Line Shifting / Fiber Cut ইত্যাদি প্রস্তুত থাকবে
- অন্য POP-এর client/category leak হবে না — সব server-side validated
- Admin module ও অন্যান্য POP page অপরিবর্তিত

### Technical notes
- DB schema change লাগবে না (শুধু default rows seed)
- RLS loosen হচ্ছে না
- Existing `support_categories` admin-এর জন্যও same data — শুধু POP read access portal-এর মাধ্যমে দিচ্ছি

