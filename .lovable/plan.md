

## আসল সমস্যা (data দেখে নিশ্চিত)

ডাটাবেসে এই অবস্থা পেয়েছি:

| কী | অবস্থা |
|---|---|
| `branch_managers` (২টি POP: noman, Demo) | দুটোরই `branch_id = NULL` |
| `clients` (৭ জন: Naim, Demo Client, aftabnogor_office, naeem, nafisa, Noman, Noman) | সবার `branch_id = NULL` |

**Managers.tsx-এ count code:**
```ts
const key = c.branch_id || "_none";   // সব client "_none" key-তে জমা হয়
...
const c = clientCounts?.[m.branch_id || "_none"];  // দুই POP-এই "_none" → একই ৭ count!
```

ফলে দুটো POP row দুটোই **একই ৭** client দেখাচ্ছে — আসলে ৭ জনের কেউ-ই কোনো POP-এর সাথে যুক্ত না (orphan)। এজন্য detail-এ গেলে client list খুঁজে পাচ্ছেন না।

## কেন হলো
- POP তৈরির সময় `branch_id` set হয়নি (POP form-এ branch পছন্দ optional ছিল / skip হয়েছে)
- Client import-এর সময়ও `branch_id` map হয়নি — তাই ৭ জনই branch ছাড়া বসে আছে

## সমাধান (৩ স্তর)

### A. তৎক্ষণাৎ data fix (migration)
1. প্রতিটি `branch_managers` row-এর জন্য একটা `branches` row তৈরি (যদি না থাকে) এবং `branch_managers.branch_id` set করা
2. বিদ্যমান ৭ client-কে একটা POP-এর সাথে assign করা — কিন্তু কোন POP-এ যাবে এটা **আপনাকে decide করতে হবে** (data থেকে guess করা ঠিক হবে না)

### B. Managers page — সঠিক display
- "_none" fallback সরিয়ে: `branch_id` NULL হলে count **0** দেখাবে
- Table-এর নিচে আলাদা **"Unassigned Clients (orphan)"** row বা banner — যেখানে দেখা যাবে "৭ জন client কোনো POP-এ নেই" + একটা link "এদের দেখুন/assign করুন"

### C. Future-proof (নতুন import/create)
- POP create form-এ `branch_id` **required** করা (যদি না থাকে auto-create branch)
- Client import-এ `branch_id` (POP code দিয়ে) mandatory column করা
- Client list page-এ filter "POP দ্বারা" — orphan client খুঁজে বের করার জন্য

## ক্লায়েন্টরা আসলে কোথায়
**সরাসরি উত্তর:** ৭ জন client `clients` table-এ আছে, কিন্তু `branch_id = NULL` — তাই কোনো POP-এর সাথে link নেই। যেকোনো POP-এ গেলে ৭ দেখাচ্ছে কারণ code দুটোকেই same "_none" bucket-এ মিলিয়ে ফেলছে।

৭ জনের list:
1. Naim (naim) — Active
2. Demo Client (client01) — Inactive
3. aftabnogor_office — Personal
4. naeem — Active
5. nafisa (abcd) — Left
6. Noman (nafisa) — Active
7. Noman (noman) — Active

## আমাকে যা জানাতে হবে
এই ৭ client কোন POP-এ assign হবে?

1. **সব ৭ জন → noman (POP 0001)** এ
2. **সব ৭ জন → Demo POP (0002)** এ
3. **আমি manually এক-এক জন assign করব** — তাহলে শুধু code fix করব (count + orphan banner), data unchanged থাকবে
4. **এদের সবাই-কে delete করব** (test data ছিল)

উত্তর পেলে migration + code fix একসাথে apply করব।

