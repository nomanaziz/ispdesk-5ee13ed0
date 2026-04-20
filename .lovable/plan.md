

## লক্ষ্য — POP `AddClient`-কে আপনার logic অনুযায়ী smart auto-fill করা

বর্তমানে POP admin যখন client add করতে যায়, সব field admin-এর মতো manual। আপনি চান অনেক field POP profile থেকে auto-fill হোক, আর কিছু field hide/disable হোক যেগুলো POP-কে decide করতে হবে না।

### পরিবর্তন ১ — জেলা/উপজেলা auto-show (Zone থেকে নয়, POP profile থেকে)
**Field**: "জেলা" ও "উপজেলা/থানা" — এখন placeholder *"জোন থেকে"* দেখায়।

**হবে**:
- POP mode-এ POP profile-এর `district_id` ও `upazila_id` থেকে নাম fetch করে disabled input-এ দেখাবে: যেমন *"মাদারীপুর"* / *"মাদারীপুর সদর"*
- Save payload-এ এগুলো auto inject (ইতিমধ্যে আছে — শুধু UI display ঠিক করতে হবে)
- যদি POP-এ extra `pop_district_assignments` থাকে → dropdown দেখাবে (allotted areas মধ্যে select করতে পারবে)
- Admin mode-এ ফাঁকা/manual থাকবে যেমন আছে

### পরিবর্তন ২ — Default Server auto-fill
**Field**: "সার্ভার *" — এখন POP-কে dropdown থেকে বাছতে হয়।

**হবে**:
- POP mode-এ `branch_managers.server_id` (অথবা POP-এর tariff-এ assigned server) থেকে default server auto-set
- POP-এর tariff-এ যেই server linked সেটাই priority পাবে (POP-এর monthly tariff)
- Field টা POP mode-এ **disabled + readonly** দেখাবে server name সহ — POP change করতে পারবে না
- Auto-fill হলেই MikroTik profiles fetch হবে

### পরিবর্তন ৩ — Protocol Type default `PPPoE` + locked
- POP mode-এ select disabled, value `PPPoE` (default) — admin চাইলে অন্যটাও পরে করতে পারে কিন্তু POP নয়

### পরিবর্তন ৪ — Profile auto-fill from Package (POP customize করতে পারবে না)
এখন `profile` POP নিজেই dropdown থেকে বাছতে পারে — এটা security risk (পাঁচশ টাকার package দিয়ে 100MB profile)।

**হবে**:
- POP mode-এ Package select করলে `reseller_tariff_packages.mikrotik_profile` field থেকে profile auto-set
- Profile field POP mode-এ **disabled** — locked from tariff configuration
- Admin mode untouched (admin চাইলে override করতে পারবে)

### পরিবর্তন ৫ — Package list শুধু admin-allotted (already done) + Selling rate auto-fill
এটা already implemented। শুধু confirm করব:
- Package select করলে `selling_rate` (admin-set) → `monthly_bill`-এ চলে আসে
- POP চাইলে monthly_bill-এ কম-বেশি লিখতে পারবে (manual override allowed, যেমন আপনি বললেন)

### পরিবর্তন ৬ — Client Code auto-generation + duplicate check
এখন `client_id` empty থাকলে DB trigger `set_client_code` `<pop_code>-<6digit>` format-এ auto-generate করে।

**হবে**:
- POP mode-এ field ফাঁকা থাকলে placeholder দেখাবে: *"স্বয়ংক্রিয়: `{pop_prefix}-000001`"*
- POP যদি custom লেখে (অথবা username field পূরণ করে) → username-কে by default `client_id`-এ copy
- **Duplicate check**: blur event-এ পুরো `clients` table query করব (`branch_id` filter ছাড়া — global), match পেলে red error: *"এই client code অন্য POP/Admin-এ ব্যবহৃত হয়েছে"*

### পরিবর্তন ৭ — Heading clean
- `POP — {popName}` heading-এর সাথে subtitle যোগ: *"নতুন ক্লায়েন্ট — Server, Profile ও জেলা স্বয়ংক্রিয় POP profile থেকে"*

## File changes

**Modify (1):**
- `src/pages/dashboard/clients/AddClient.tsx`
  - District/Upazila names fetch (one new query) + disabled display
  - Server auto-fill from POP profile/tariff + disabled in POP mode
  - Protocol Type disabled+default in POP mode
  - Profile auto-fill from selected package's `mikrotik_profile` + disabled in POP mode
  - Client Code: placeholder hint + onBlur duplicate check
  - Tariff package query expanded to include `mikrotik_profile`, `mikrotik_server_id`

**No DB migration needed** — সব field already আছে (`branch_managers.server_id`, `reseller_tariff_packages.mikrotik_profile`, `pop_district_assignments`)।

## যা হবে না
- Admin mode-এর behavior অপরিবর্তিত
- POP mode-এ profile/server লুকানো (hide) হবে না — শুধু **disabled + auto-filled** দেখাবে যাতে POP বুঝতে পারে কী চলছে
- Zone/Sub-zone/Box auto-fill হবে না — এগুলো POP নিজে বানায় (যেমন আপনি বললেন)

approve করলে implement শুরু করি।

