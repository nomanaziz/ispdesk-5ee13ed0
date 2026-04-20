

## লক্ষ্য
আপনার চারটা request implement করা:

### ১. Postpaid POP-এর জন্য "Negative Balance অনুমোদন" toggle তুলে দেওয়া
**File**: `src/components/branches/PopForm.tsx`

- **Negative Balance switch পুরোপুরি সরাবো** (Postpaid block থেকে)
- **Min Balance field-কে empty allow করব** (nullable):
  - খালি = "no minimum, negative balance allowed automatically"
  - `0` = "must stay at zero or above"
  - কোনো সংখ্যা = সেই minimum maintain করতে হবে
  - Helper text: *"খালি রাখলে balance negative-এ যেতে দিবে। 0 বা সংখ্যা দিলে সেই সীমা maintain করবে।"*
- Save logic: `min_balance` empty হলে `null` save হবে; backend `allow_negative_balance` derive করবে: `min_balance IS NULL`
- `allow_negative_balance` column এ আর touch করব না form থেকে — backend trigger/code derive করবে (later) অথবা শুধু min_balance এর ভিত্তিতে decide হবে

### ২. POP Permission tree ↔ Sidebar sync (BTRC removal সহ)
**Problem**: `popPermissions.ts`-এর তালিকা আর `ResellerLayout.tsx`-এর actual sidebar মিলে না। যেমন BTRC permission key আছে কিন্তু sidebar থেকে আগেই বাদ পড়েছে; আবার sidebar-এ "Sub Zone" আছে কিন্তু permission group তৈরি ভিন্ন naming-এ।

**Action**:
- `src/lib/popPermissions.ts`-এ permission tree-কে **ResellerLayout-এর সঠিক ১২টা group + items**-এর সাথে ১:১ mirror করব। প্রতিটা sidebar item-এর সাথে matching permission key থাকবে।
- **BTRC report বাদ** (`report.btrc` key remove)
- নতুন structure মিলাবে: dashboard, configuration (9 items), mikrotik, employee (5), client (5), billing (4), monitoring (3), sms (4), reports (6, no BTRC), purchases, system (3), fund_history (2)
- `ResellerLayout.isGroupAllowed`-এ permission key match update — শুধু sub-user-এর জন্য item-level filtering যোগ (যাতে গ্রুপ open হলেও যে item-এ permission নেই সেটা hide)
- **Two-way sync**: Permission tree update করলেই sidebar-এ reflect হবে (single source of truth)

### ৩. PopAllotment: Auto-prefill from POP form's Division/District/Upazila
**File**: `src/pages/dashboard/branches/PopAllotment.tsx`

আপনার বিবরণ: POP form-এ যে division/district/upazila set করা আছে সেটাই default allotment হিসেবে show করবে। Manual `pop_district_assignments` সাধারণত লাগবে না — শুধু "Add another" দিয়ে extra উপজেলা/জেলা যোগ করতে চাইলে।

**Action**:
- Component-এ `popId` props পাশাপাশি POP-এর `district_id` + `upazila_id` props নেওয়া (অথবা component নিজেই query করবে `branch_managers` থেকে)
- **Default state**: যদি `pop_district_assignments`-এ কোনো row না থাকে এবং POP-এ district/upazila set আছে → একটা virtual row দেখাবে: POP-এর own district + own upazila pre-checked, সাথে badge "(Default — POP profile থেকে)"
- **UI simplification**: "Add another Upazila" / "Add another District" button যোগ করব। By default শুধু own district expanded থাকবে।
- **Auto-apply on client create**: `PopAddClient.tsx`-এ district/upazila dropdown — যদি সেই POP-এর default থাকে এবং কোনো extra allotment না থাকে, by default নিজের district/upazila pre-fill হয়ে যাবে। Extra allotment থাকলে option list-এ সব আসবে।
- (Read-only optimization for POP portal: `PopDistricts`/`PopUpazilas` page POP-এর own + extra allotment-এর union দেখাবে।)

### ৪. Postpaid POP daily-recharge enforcement (must-have-fund rule)
আপনার বিবরণ: Postpaid POP-এর client-ও daily-rate basis-এ চলবে — POP-এর portal balance শূন্য/negative হলে ১০-দিনের মধ্যে fund add করতে হবে, না হলে auto-disable। ৩০ দিন টানা চালানোর সুযোগ নাই।

**Action (এই batch-এ schema + UI hint, enforcement next batch-এ)**:
- PopForm-এর Postpaid block-এ Helper banner add করব:
  > *"Postpaid POP-ও daily-rate এ deduct হবে। Auto-disable তারিখের মধ্যে balance negative হলে সব client off হবে। Admin fund দিতে পারে (ধার), POP নিজেও recharge করতে পারে।"*
- Existing `auto_disable_day` field রাখব — কিন্তু label clearer: *"মাসের কত তারিখের মধ্যে আগের মাসের পাওনা মিটানো must"*
- **Enforcement edge function** (next batch-এ pull করব):  
  - Daily cron `enforce-billing` already exists — Postpaid POP-এর জন্য daily deduction logic যোগ করব  
  - `auto_disable_day` cross করলে এবং balance < min_balance (or < 0 if min null) হলে সব client suspend
- এই plan-এ শুধু **UI label + helper text update**; cron logic-এর জন্য আলাদা batch।

## File changes এই sprint-এ

**Modify (3):**
- `src/components/branches/PopForm.tsx` — Negative Balance switch remove, Min Balance nullable, Postpaid helper banner update
- `src/lib/popPermissions.ts` — Permission tree restructure to mirror sidebar (BTRC removed, all 12 groups synced)
- `src/components/ResellerLayout.tsx` — Sub-user item-level permission filter using new keys
- `src/pages/dashboard/branches/PopAllotment.tsx` — Auto-prefill POP's own district/upazila as default; "Add another" UX

**No DB migration needed** এই batch-এ (existing columns sufficient — `min_balance` already nullable; `allow_negative_balance` rakhi for backward compat কিন্তু form থেকে edit হবে না)।

## যা **হবে না**
- Cron-based daily deduction enforcement (পরের batch)
- `allow_negative_balance` column drop (backward-compat রাখব; form থেকে hide)
- Existing POP records-এ retroactive change

approve করলে implement শুরু করব।

