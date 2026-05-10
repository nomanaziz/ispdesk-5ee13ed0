## Problem
এখনকার "Bulk Profile Change" আসলে **package change**-ই করে — package select করলে একসাথে `package_id`, `profile`, `speed`, `monthly_bill` সব update হয়। User চাচ্ছেন এই দুটো আলাদা হোক:

| Action | কী change হবে | কী হবে না |
|---|---|---|
| **Bulk Profile Change** | `clients.profile` + MikroTik PPP profile (speed) | `package_id`, `monthly_bill` অপরিবর্তিত |
| **Bulk Package Change** | `clients.package_id`, `monthly_bill` (= package price) | `profile`, MikroTik speed অপরিবর্তিত |

কারণ: admin চাইতে পারে ৫০০ টাকার package-এ বেশি speed-এর profile দিতে — যা reseller পারে না। এখন একসাথে coupled থাকায় সেটা সম্ভব না।

## পরিবর্তন

### 1. `src/components/billing/BulkProfileChangeDialog.tsx` — Rewrite
- Package dropdown সরিয়ে **Profile dropdown** আনব।
- Profile-এর source: একটা MikroTik server selector (default = প্রথম selected client-এর `mikrotik_id`) → তারপর `fetch-mikrotik-profiles` edge function call করে সেই device-এর live profile list।
- যদি selected client-রা ভিন্ন device-এ থাকে → একটা warning: "Selected clients একাধিক MikroTik server-এ আছে। সবগুলোতে একই profile name থাকা প্রয়োজন।"
- Submit:
  - DB: `update clients set profile = <chosenName> where id in (...)` — আর কিছু না।
  - MikroTik: প্রতিটা client-এর জন্য `manage-mikrotik-ppp` action `update` দিয়ে শুধু `profile` পাঠাব (existing pattern)।
- Title: "শুধু Profile (Speed) পরিবর্তন"।

### 2. `src/components/billing/BulkPackageChangeDialog.tsx` — New
- Package dropdown (active `isp_packages`)।
- Submit:
  - DB: `update clients set package_id = <id>, monthly_bill = <price> where id in (...)` — `profile`, `speed`, MikroTik কিছুই touch করব না।
- Title: "শুধু Package (Price) পরিবর্তন"।
- Helper text: "প্রোফাইল/স্পিড অপরিবর্তিত থাকবে। শুধু বিল ও প্যাকেজ ম্যাপিং পরিবর্তন হবে।"

### 3. `src/components/billing/BulkActionButtons.tsx`
- নতুন prop: `onBulkPackageChange?: () => void` + button **"প্যাকেজ পরিবর্তন"** (`Package` icon)।
- Existing "প্রোফাইল পরিবর্তন" button রাখব — কিন্তু এখন এটা শুধু profile dialog খুলবে।

### 4. `src/pages/dashboard/clients/ClientList.tsx`
- নতুন state: `packageChangeOpen`।
- নতুন import + dialog mount।
- BulkActionButtons-এ `onBulkPackageChange={() => setPackageChangeOpen(true)}` পাঠাব।

## Out of Scope
- Profile-package validation rules (যেমন "এই package-এ এই profile allowed কি না") — admin-এর সম্পূর্ণ স্বাধীনতা থাকবে।
- POP/reseller scope-এ Package Change লুকানো — পরে যদি লাগে, `showPackageChange` flag দিয়ে toggle করা যাবে। আপাতত admin & POP দুজনের জন্যই দেখাব (admin চাইলে use করবে, POP-এ usually disabled থাকতে পারে — পরে decide)।
- Schema change দরকার নেই।

## Files
- `src/components/billing/BulkProfileChangeDialog.tsx` — rewrite
- `src/components/billing/BulkPackageChangeDialog.tsx` — new
- `src/components/billing/BulkActionButtons.tsx` — new button + prop
- `src/pages/dashboard/clients/ClientList.tsx` — wiring
