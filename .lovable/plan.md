
## লক্ষ্য
তিনটা জিনিস একসাথে ঠিক করা:
1. **Revert করা MikroTik user** আবার **Import from MikroTik** list-এ ফিরবে  
2. **POP Manager list**-এ Nahid/Naeem-এর **running 3 / 4** zero হবে  
3. **POP Profile → Unexported**-এ ভুলভাবে সব 13 user দেখানো বন্ধ হবে

## আসল সমস্যা
এখানে ৩টা আলাদা logic bug একসাথে আছে:

### ১) Import page ভুল filter ব্যবহার করছে
`Import.tsx` এখন `clients.username` দেখে MikroTik user hide করছে।  
তাই PPP user revert হলেও যদি একই username-এর `clients` row এখনো থাকে, user আর import list-এ আসে না।

### ২) Revert half-done হচ্ছে
এখন revert শুধু `mikrotik_clients` row reset করছে।  
কিন্তু আগে POP থেকে তৈরি হওয়া `clients` row delete/rollback হচ্ছে না।  
ফলাফল:
- POP Manager list-এ running count থেকে যাচ্ছে
- Import page-এ same username block হচ্ছে
- data দুই table-এ mismatch হয়ে যাচ্ছে

### ৩) POP Profile-এর Unexported logic ভুল table field-এর উপর দাঁড়ানো
`PopUnexportedClients.tsx` এখন:
- `branch_id == pop.branch_id`
- অথবা `transferred_to_pop_id == popId`

এই logic ব্যবহার করছে।

কিন্তু `mikrotik_clients.branch_id` আসলে **device branch sync field** — POP ownership field না।  
`fetch-mikrotik-ppp` sync-এর সময় device-এর `branch_id` সব PPP row-তে বসে যাচ্ছে।  
তাই branch-scoped server-এর সব 13 user ভুল করে **Unexported**-এ ঢুকে যাচ্ছে।

---

## কী করা হবে

### ১) Revert-কে full rollback করা হবে
Revert-এর সময় একসাথে ২টা table handle করা হবে:

#### `mikrotik_clients`
এই field গুলো clear হবে:
- `transferred_to_pop_id = null`
- `transferred_to_mikrotik_id = null`
- `transferred_at = null`
- `linked_client_id = null`
- `exported = false`
- `exported_to = null`

#### related `clients`
যদি POP conversion থেকে তৈরি হওয়া active client row থাকে, সেটা:
- detect করা হবে by previous `linked_client_id`
- fallback হিসেবে `username + branch_id + owner_scope='pop'`
- তারপর delete বা rollback করা হবে

এটা **single atomic server-side operation**-এ করা হবে, যাতে half-success state না থাকে।

### ২) Import from MikroTik page-এর filter ঠিক করা হবে
`existing_client_usernames`-based hard hide তুলে দেওয়া হবে।

নতুন rule:
- Import list show হবে `mikrotik_clients` state অনুযায়ী
- username duplicate থাকলে চাইলে warning badge থাকবে
- কিন্তু stale `clients` row-এর কারণে PPP user hide হবে না

অর্থাৎ import eligibility হবে:
- `transferred_to_pop_id IS NULL`
- `linked_client_id IS NULL`
- `exported = false`
এর মতো record-state ভিত্তিক logic দিয়ে

### ৩) POP Profile → Unexported tab নতুনভাবে define করা হবে
**Unexported** মানে:
- এই POP-এ **actually transferred** হয়েছে
- কিন্তু এখনো client বানানো হয়নি

তাই query হবে:
- `transferred_to_pop_id = popId`
- `linked_client_id IS NULL`

`branch_id = pop.branch_id` দিয়ে আর Unexported ধরা হবে না।

এতে AFTABNAGAR server-এর raw 13 user আর ভুল করে Nahid-এর Unexported list-এ আসবে না।

### ৪) POP Profile → Exported tab-ও tighten করা হবে
**Exported** মানে:
- POP থেকে client-এ convert হয়েছে

তাই source হবে:
- `mikrotik_clients.linked_client_id IS NOT NULL`
- linked `clients` row valid
- linked client POP scope-এ আছে

এতে stale linked/unlinked mismatch কমবে।

### ৫) POP Manager list count logic robust করা হবে
Running count শুধু `clients` table থেকে উঠবে, কিন্তু stricter rule-এ:
- `owner_scope = 'pop'`
- `status NOT IN ('left','inactive')`

আর revert/left/delete হলে proper invalidation হবে:
- `pop-client-counts`
- `branch-managers`
- `pop-detail`
- `mikrotik_clients`
- `existing_client_usernames`

### ৬) Existing broken data repair করা হবে
শুধু code fix দিলে পুরনো stale row ঠিক হবে না।  
তাই current DB data-ও repair করতে হবে:

#### Nahid branch
এখন যেসব active POP client row পড়ে আছে এবং revert হওয়া PPP-এর orphan হয়ে আছে, সেগুলো clean করা হবে

#### Naeem branch
same cleanup

Expected immediate effect:
- Nahid running 3 → 0
- Naeem running 4 → 0
- reverted PPP user আবার Import page-এ visible

---

## টেকনিক্যাল approach
সবচেয়ে safe implementation হবে একটি **database function / RPC** বা admin-side secure server operation:

```text
revert_mikrotik_client(mikrotik_client_id, pop_id)
  1. locate mikrotik row
  2. capture previous linked client / fallback client row
  3. delete or rollback POP-created client row
  4. clear transfer/export/link fields in mikrotik_clients
  5. return summary
```

কারণ browser থেকে ২টা table আলাদা mutate করলে আবার partial mismatch হতে পারে।

---

## কোন file বদলাবে
- `src/pages/dashboard/mikrotik/Import.tsx`
- `src/components/branches/PopUnexportedClients.tsx`
- `src/components/branches/PopExportedClients.tsx`
- `src/pages/dashboard/branches/Managers.tsx`
- `src/pages/dashboard/branches/PopProfile.tsx` (query invalidation / counts if needed)
- `supabase/migrations/...sql` (revert RPC / cleanup SQL)
- প্রয়োজনে `src/integrations` touch না করে existing Supabase client দিয়েই RPC call

---

## Data repair scope
Current broken rows targeted:
- Nahid branch-এর orphan active POP clients
- Naeem branch-এর orphan active POP clients
- corresponding reverted `mikrotik_clients` rows

---

## Apply-এর পরে expected ফলাফল
1. Revert করা user আবার **Import from MikroTik** list-এ আসবে  
2. **POP Manager list**-এ Nahid/Naeem running count zero হবে  
3. **POP Profile → Unexported**-এ আর branch-এর সব 13 raw user দেখাবে না  
4. Exported/Unexported meaning বাস্তব business logic অনুযায়ী হবে  
5. ভবিষ্যতে revert করলে stale client row পড়ে থাকবে না

## Test cases
1. **Nahid POP Profile → Unexported**
   - expected: 13 raw branch users আর থাকবে না
   - only truly transferred-but-not-converted rows দেখাবে

2. **Admin → Import from MikroTik**
   - reverted user আবার pending list-এ আসবে

3. **POP Manager list**
   - Nahid running = 0
   - Naeem running = 0

4. **Future revert flow**
   - client row cleanup + mikrotik row reset
   - import pool visible
   - counts update without manual retry
