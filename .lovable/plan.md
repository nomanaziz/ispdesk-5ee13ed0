

## Bulk Client Import — দুটো Page একসাথে Merge

### সমস্যা
POP Admin sidebar-এর "ক্লায়েন্ট" group-এ এখন দুটো similar item:
1. **এক্সেল ইম্পোর্ট** → `/pop-admin/clients/bulk-import` (Excel file থেকে নতুন client)
2. **বাল্ক ক্লায়েন্ট ইম্পোর্ট** → `/pop-admin/mikrotik-users/bulk-create` (MikroTik transferred users থেকে client)

দুটোর purpose আলাদা কিন্তু sidebar-এ পাশাপাশি দেখে confusing লাগছে।

### সমাধান — Tabbed Single Page
একটাই sidebar entry **"বাল্ক ক্লায়েন্ট ইম্পোর্ট"** রাখা হবে, যেটা একটা page খুলবে — page-এর ভিতরে দুটো **Tab** থাকবে:

```text
বাল্ক ক্লায়েন্ট ইম্পোর্ট  (/pop-admin/clients/bulk-import)
├─ Tab 1: 📄 Excel/CSV থেকে ইম্পোর্ট     (existing PopBulkClientImport logic)
└─ Tab 2: 🌐 MikroTik ইউজার থেকে ইম্পোর্ট  (existing ResellerMikrotikBulkCreate logic)
```

### Files to Change

| File | Change |
|---|---|
| **NEW** `src/pages/reseller/clients/BulkClientImportHub.tsx` | Wrapper page with `<Tabs>` — দুটো existing component render করবে |
| `src/pages/reseller/clients/PopBulkClientImport.tsx` | Top header/back button সরিয়ে dialog/embeddable করে দেওয়া (page wrapper বাদ) |
| `src/pages/reseller/ResellerMikrotikBulkCreate.tsx` | একই — top header/back button সরানো (Tab-এ embed হবে) |
| `src/components/ResellerLayout.tsx` (line 78–80) | `মাইক্রোটিক ইউজার` রাখব (separate page), দুটো import item মুছে দিয়ে শুধু একটাই entry: `বাল্ক ক্লায়েন্ট ইম্পোর্ট` → `/pop-admin/clients/bulk-import` |
| `src/App.tsx` (line 772) | `/pop-admin/clients/bulk-import` → নতুন `BulkClientImportHub` render করবে। `/pop-admin/mikrotik-users/bulk-create` route রাখব backward-compat-এর জন্য, একই Hub render করবে (default tab=mikrotik) |
| `src/lib/iconResolver.ts` | অপরিবর্তিত (পথ একই থাকছে) |

### Tab Behavior
- URL query param `?tab=excel` বা `?tab=mikrotik` দিয়ে default tab control
- `/pop-admin/mikrotik-users/bulk-create` route hit করলে auto `?tab=mikrotik` open হবে (পুরনো link ভাঙবে না)
- Default tab: **Excel** (বেশি common use)

### যা বদলাবে না
- দুটো page-এর core logic, validation, API calls — সম্পূর্ণ অপরিবর্তিত
- "মাইক্রোটিক ইউজার" sidebar item — আলাদা থাকবে (এটা list view, import না)
- Routes দুটোই কাজ করবে (backward-compat)
- Database, RBAC, business logic

### Outcome
Sidebar-এ একটাই clean "বাল্ক ক্লায়েন্ট ইম্পোর্ট" entry — ভিতরে গিয়ে user নিজে choose করবে Excel থেকে আনবে নাকি MikroTik থেকে। কোনো feature loss নেই, শুধু confusion দূর।

