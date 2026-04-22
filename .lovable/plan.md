

## লক্ষ্য
Import from MikroTik page-এ **USER TYPE** filter-এর meaning ঠিক করে ৩টা logical option করা: **Unique**, **Duplicate**, **Unlisted** — যাতে admin দ্রুত বুঝতে পারে কোন PPP user কোথায় আছে।

## নতুন definition

| Option | মানে |
|---|---|
| **Unique** | এই username শুধু **একটাই MikroTik server**-এ আছে (cross-server গণনা = 1) |
| **Duplicate** | একই username **একাধিক MikroTik server**-এ exist করছে (cross-server গণনা ≥ 2) |
| **Unlisted** | এই PPP user **কোনো POP/Client list-এ নেই** — মানে `clients` table-এ এই username নেই, এবং `mikrotik_clients`-এও `transferred_to_pop_id IS NULL` ও `linked_client_id IS NULL` |
| **All** | সব দেখাবে (default) |

> পুরনো `unique/duplicate/disabled` (যেটা `user_status` column থেকে আসত — এটা actually MikroTik-এর enabled/disabled flag) আর filter হিসেবে ব্যবহার হবে না। সেটার দরকার হলে আলাদা ছোট badge হিসেবে রাখা যাবে, কিন্তু dropdown থেকে সরবে।

## কী কী করা হবে

### ১) `Import.tsx`-এ User Type filter rebuild
- Dropdown options: `All`, `Unique`, `Duplicate`, `Unlisted`
- `clients` table থেকে username set আনা (already আছে: `existingUsernames`)
- সব `mikrotik_clients` row থেকে username → কতগুলো server-এ আছে map বানানো (client-side aggregation, lowercase username + distinct `mikrotik_id`)
- Filter logic:
  - `unique` → server count == 1
  - `duplicate` → server count ≥ 2
  - `unlisted` → username `clients` table-এ নেই AND এখনো কোনো POP-এ transfer হয়নি

### ২) Username duplicate count efficiently আনা
দরকার হবে সব server-এর সব PPP user-এর `(name, mikrotik_id)` জোড়া। তাই একটা hালকা parallel query:
- `mikrotik_clients` থেকে শুধু `name, mikrotik_id` select করে cross-server map তৈরি
- এই query একবারই run হবে (cached) — list filter তার পরে memoize করে চলবে

### ৩) Pending filter logic অপরিবর্তিত
আগের core rule যেটা ঠিক হয়েছিল সেটা থাকবে:
- `transferred_to_pop_id IS NULL`
- `linked_client_id IS NULL`
- `exported = false / null`
- AND username `clients` table-এ নেই (existing hide rule)

User Type filter এই base list-এর উপর extra layer হবে।

### ৪) Visual polish
- Filter label বাংলায়: **ইউজার টাইপ**
- Each row-এ ছোট badge: যদি duplicate হয় → `Duplicate (3 servers)` ছোট badge দেখানো (optional, helpful)
- "Branch" column আগেই সরানো হয়েছে — অপরিবর্তিত

## কোন file বদলাবে
- `src/pages/dashboard/mikrotik/Import.tsx` (filter dropdown + logic + duplicate count query)

## কোন file বদলাবে না
- DB schema, RLS, edge functions, অন্য pages

## Apply-এর পরে expected ফলাফল
1. **Unique** select করলে → শুধু সেই PPP user যাদের username একটাই server-এ আছে
2. **Duplicate** select করলে → multiple server-এ থাকা username গুলো (যেমন "moron" 3 server-এ থাকলে 3 row-ই আসবে)
3. **Unlisted** select করলে → যেগুলো কোনো client list / POP-এ নেই — pure raw MT user
4. Pending tab-এর base behavior অপরিবর্তিত (already-listed user hidden থাকবে)

