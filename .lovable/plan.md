## সমস্যা ও সমাধান

### সমস্যা ১ — Expired client কখনই MikroTik এ enable হওয়া যাবে না
বর্তমান guard শুধু `auto_recharge_enabled === false` হলে block করে। User চাইছে — **expire_date পেরিয়ে গেলে যে কেউ (auto on/off নির্বিশেষে) enable করতে পারবে না**, এবং backend periodically expired user-দের disable করে দেবে।

### সমস্যা ২ — POP transfer-এ profile/package leak (highest priority)
Admin যখন MikroTik user POP-এ transfer করে, এখন শুধু একটিমাত্র package select হয় এবং সেই package-এর `mikrotik_profile`-এর সাথে user-এর profile mismatch হলেই block। কিন্তু:
- POP-এর tariff-এ কোন package আদৌ আছে কিনা সেটা enforce হচ্ছে না।
- Mixed profile-এর case-এ একসাথে multiple package match করার কোনো উপায় নেই — তাই admin ভুল profile-এর user push করে দিতে পারে।
- POP নিজে যদি অন্য (বড়) profile-এর package admin-এর কাছ থেকে না কিনে থাকে, তবুও পুরনো ভুল-transfer record-এ সেই profile থেকে যাচ্ছে → revenue leak।

POP "0002"-এর কাছে শুধু Basic (5MB, কিনা ২৫০, বিক্রি ৫০০) আর Standard (10MB, ৪০০) tariff-এ assign করা — কিন্তু client list-এ অন্য profile-এর user বসে আছে।

---

## Plan

### ১) Frontend: Expired = forced MikroTik OFF (ClientList)
- `handleToggleMikrotik`-এ guard শক্ত করা: `auto_recharge_enabled` যাই হোক, **expired হলে enable allowed না**।
- Toggle switch-এর `disabled` prop-এ expired condition যোগ — UI-তেই switch grey দেখাবে, hover tooltip-এ কারণ।

### ২) Backend cron: Expired auto-disable (সব ক্ষেত্রে)
- `apply-pop-daily-charges` এখন শুধু `auto_off + expired` হলে disable করে। এটাকে generalize: **যেকোনো expired client (`expire_date <= today` এবং `mikrotik_status = enabled`)** হলে `toDisable` list-এ দিয়ে `manage-mikrotik-ppp { action: "disable" }` invoke। Auto-recharge ON হলেও যদি কোনো কারণে balance fail করে recharge না হয়, expired থেকে গেলে disable।
- Run frequency: এই cron দিনে একবার চলে; user "একটু পর পর check"-এর কথা বলেছেন — তাই একই disable-loop নতুন একটা lightweight cron `enforce-expired-disable` হিসেবে প্রতি ১৫ মিনিটে বসানো হবে (DB hit কম, শুধু expired+enabled rows query)।

### ৩) Transfer-to-POP package matching (leak plug — মূল fix)

**Validation rules (TransferToPopDialog + transfer mutation):**

1. POP select-এর পর, dialog-এ আর single "Package" dropdown থাকবে না। বদলে — selected MikroTik users-এর প্রতিটি unique profile-এর জন্য **POP-এর tariff থেকে auto-match** করে একটা table দেখাবে:

   ```
   User Profile        → Match in POP Tariff       → Decision
   5M-PPPoE  (12 user) → ✓ Basic (৳500/30d, 5M)    → Auto-assign
   10M-PPPoE ( 4 user) → ✓ Standard (৳400/30d, 10M)→ Auto-assign
   100M-PPPoE( 1 user) → ✗ No matching package      → BLOCK
   ```

2. কোনো একটি profile-ও match না হলে **transfer button disabled**, error: "X জন user-এর profile POP-এর tariff-এ নেই — আগে MikroTik-এ profile change করুন বা POP-এর tariff-এ এই package add করুন"।

3. Match করার সময়: POP-এর `reseller_tariff_packages` থেকে যেগুলোর `mikrotik_profile === user.profile` সেগুলো filter। একাধিক match থাকলে cheapest `selling_rate` নেওয়া হবে (সবচেয়ে conservative)। Match-এ `validity_days`, `selling_rate`, `mikrotik_server_id` সবই profile-নির্দিষ্ট।

4. Per-package গণনা করে total creditable = `Σ (selling_rate / validity_days × users_in_that_profile)`। Existing per-day debit logic একই থাকবে, শুধু per-package।

5. Insert করার সময় client row-এ `package_id`, `monthly_bill`, `mikrotik_id`, `profile` — সবকিছু **matched POP package থেকে** নেওয়া হবে, user-এর original MikroTik profile string থেকে নয়। ফলে POP যদি পরে portal থেকে edit করতে যায়, dropdown-এ শুধু তার tariff-এর package-ই দেখাবে (এটা অলরেডি enforced)।

### ৪) POP portal — profile override block (safety net)
- `portal-data` edge function-এর `update_client` / `change_client_package`-এ সার্ভার-সাইড check বসানো: নতুন `package_id` যদি POP-এর `tariff_id`-এর `reseller_tariff_packages`-এ না থাকে → `403 PACKAGE_NOT_IN_TARIFF`।
- Manual `profile` text override-ও blocked — profile সবসময় selected package-এর `mikrotik_profile` থেকে derive হবে।

### ৫) ভুল-transfer cleanup helper (one-off, optional)
- Admin → POP "0002"-এর জন্য একটা "Reconcile clients" button: যাদের current `package_id` POP-এর tariff-এ নেই, তাদের নাম + profile list দেখাবে এবং admin manually re-map বা MikroTik profile change করতে পারবে। (এই step user approve করলে separate task।)

---

## Technical changes

| File | Change |
|---|---|
| `src/pages/dashboard/clients/ClientList.tsx` | `handleToggleMikrotik` — expired হলে সব ক্ষেত্রে block; Switch `disabled` prop update |
| `src/components/mikrotik/TransferToPopDialog.tsx` | Single package dropdown বাদ → per-profile auto-match table; mutation per-package insert + per-package debit |
| `supabase/functions/apply-pop-daily-charges/index.ts` | Expired+enabled সবাইকে toDisable-এ যোগ |
| New `supabase/functions/enforce-expired-disable/index.ts` + cron | প্রতি ১৫ মিনিটে expired+enabled scan & disable |
| `supabase/functions/portal-data/index.ts` | `update_client`/`change_client_package` — `package_id` POP tariff-এর মধ্যে কিনা enforce; profile override block |

---

## Validation plan

- POP "0002"-এর tariff পড়ে dataset তৈরি; mock 3 profile (5M, 10M, 100M) দিয়ে dialog test → 100M block, 5M+10M auto-assign, mixed creditable correct।
- MVP-000001 (expired) toggle attempt → blocked।
- 15-min cron run করে log check।
- POP portal থেকে অন্য tariff-এর package_id force PATCH → 403।