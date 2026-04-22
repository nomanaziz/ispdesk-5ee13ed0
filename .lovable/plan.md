

## POP Admin SMS পেজ — Send / Individual / Group / Gateway সব implement

### সমস্যা
POP Admin sidebar-এ SMS Service-এর ৪টা link আছে:
- টেমপ্লেট ✅ (already done)
- ইন্ডিভিজুয়াল / গ্রুপ ❌ placeholder
- এসএমএস পাঠান ❌ placeholder
- গেটওয়ে ❌ placeholder

Main admin-এ এই ৩টা পেজ পুরোপুরি built (`src/pages/dashboard/sms/Send.tsx`, `Individual.tsx`, `Gateway.tsx`)। POP-এর জন্য একই UX দরকার, শুধু:
- Clients filter হবে POP-এর `branch_id`-তে
- Gateways = main admin-এ যা configured আছে সেগুলাই **read-only** দেখাবে (POP add/edit করবে না)
- Company name = `branch_managers.company_name` থেকে আসবে

### Schema বাস্তবতা
| Table | `branch_id` আছে? | মানে |
|---|---|---|
| `sms_gateways` | না | global — admin manage, POP read-only |
| `sms_groups` | না | global — POP read-only filters (paid/unpaid/due) |
| `sms_log` | না (আছে: gateway_id, group_id, sent_by) | POP send → log row, recipient field-এ POP scope tag |
| `clients` | হ্যাঁ | POP filter এখানেই apply হবে |

`sms_gateways`/`sms_groups`-এ branch column add করা হবে **না** — user স্পষ্ট বলেছেন main admin-এর gateway গুলাই POP-এ আসবে।

---

### সমাধান

#### ১) `src/pages/reseller/sms/PopSmsGateway.tsx` (নতুন, read-only)
- `sms_gateways` থেকে সব active gateway list (read-only table)
- কলাম: #, নাম, Sender ID, ধরন (বাংলা/English), ডিফল্ট ⭐, স্ট্যাটাস
- উপরে info banner: *"গেটওয়ে কনফিগারেশন মূল অ্যাডমিন থেকে আসে — এডিট করতে পারবেন না"*
- সাথে company name card (POP-এর own `company_name`) — sender identity reference

#### ২) `src/pages/reseller/sms/PopSmsSend.tsx` (নতুন)
Bulk SMS — `Send.tsx`-এর POP version:
- Target dropdown: সকল ক্লায়েন্ট / পেইড / আনপেইড / বকেয়া / গ্রুপ
- সব client query-তে `.eq("branch_id", branchId)` add (`usePopScope` hook)
- Gateway dropdown = active `sms_gateways` (read-only list, POP select করে পাঠাবে)
- Template dropdown = POP-এর effective templates (already pop_list_templates আছে)
- VariableChips integration (already exists)
- Recipient count live preview
- Send → `sms_log` insert (recipient label-এ branch_id include করা হবে scoping audit-এর জন্য)
- Recent SMS card: `sms_log` last 20 যেখানে `sent_by` = POP user OR recipient label-এ branch tag

#### ৩) `src/pages/reseller/sms/PopSmsIndividual.tsx` (নতুন)
Individual / Group SMS — `Individual.tsx`-এর POP version:
- বাঁ পাশে: tabs (All/Paid/Unpaid/Due) → POP clients (branch-scoped)
- Search box, checkbox select multiple
- ডানে: number input (manual), gateway, template, message + VariableChips
- Send → multiple `sms_log` rows insert per recipient
- Selected client count visible

#### ৪) Routes wire-up — `src/App.tsx`
লাইন 774-776-এ placeholder replace:
```tsx
<Route path="/pop-admin/sms/individual" element={...<PopSmsIndividual/>} />
<Route path="/pop-admin/sms/send" element={...<PopSmsSend/>} />
<Route path="/pop-admin/sms/gateway" element={...<PopSmsGateway/>} />
```

#### ৫) POP scoping helper
`usePopScope()` already returns `branchId`. সব ৩টা পেজ এটা ব্যবহার করবে clients query-তে `.eq("branch_id", branchId)`.

#### ৬) Recent SMS log scoping
POP যাতে শুধু নিজের পাঠানো SMS দেখে — `sms_log` insert-এ `sent_by` = POP user id, এবং query: `.eq("sent_by", popUserId)` OR recipient prefix match। Simplest: `sent_by` filter use করব।

---

### Files to create
- `src/pages/reseller/sms/PopSmsGateway.tsx`
- `src/pages/reseller/sms/PopSmsSend.tsx`
- `src/pages/reseller/sms/PopSmsIndividual.tsx`

### Files to edit
- `src/App.tsx` — placeholder route গুলা replace + import

### স্পষ্ট নয় যা — assume করছি
- POP নিজের আলাদা gateway add করবে না; main admin-এর gateway POP দেখবে ও use করবে (user-এর কথা থেকে এটাই মানে দাঁড়ায়)
- Recent SMS POP-নিজের পাঠানো গুলা `sent_by` দিয়ে filter

### ফলাফল
- POP Admin-এর ৩টা placeholder পেজ পূর্ণ functional
- Main admin design-এর consistency বজায়
- POP নিজের branch-এর clients-এই SMS পাঠাতে পারবে, অন্য POP-এর নয়
- Gateway/company info auto-populate

