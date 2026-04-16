

## Software-wide Bangla Localization

### লক্ষ্য

পুরো software-এ consistent Bangla language ব্যবহার করা। Default language Bangla, কিছু technical term ইংরেজিতেই থাকবে।

### Scope

পুরো ERP-তে 200+ files আছে — সব একসাথে convert করা impractical এবং risky। তাই **phased approach** নেব।

### Translation Rules

| Original | Bangla | কারণ |
|----------|--------|------|
| Cash | ক্যাশ | নগদ একটি payment method (bKash/Nagad), confusion এড়াতে |
| bKash, Nagad, Rocket | bKash, Nagad, Rocket | Brand names — অপরিবর্তিত |
| Client / Customer | ক্লায়েন্ট / কাস্টমার | Bangla |
| Bill / Invoice | বিল / ইনভয়েস | Bangla transliteration |
| MikroTik, OLT, ONU, PPPoE, MAC, IP | অপরিবর্তিত | Technical terms |
| Status: Active/Inactive/Pending | সক্রিয়/নিষ্ক্রিয়/অপেক্ষমান | Bangla |
| Enable/Disable | চালু/বন্ধ | Bangla |
| Online/Offline | অনলাইন/অফলাইন | Transliteration |
| Save/Cancel/Delete/Edit/Add | সংরক্ষণ/বাতিল/মুছুন/সম্পাদনা/যোগ | Bangla |
| Search | অনুসন্ধান | Bangla |
| Date/Amount/Total/Due/Paid | তারিখ/পরিমাণ/মোট/বকেয়া/পরিশোধিত | Bangla |
| Numbers (1,2,3) | English digits রাখব | Tables-এ readable |

### Phased Plan

**Phase 1 (এখন) — Core Billing & Client Pages** (high-traffic):
1. `BillingList.tsx` — column headers, buttons, dialogs, status badges
2. `BillReceiveDialog.tsx` — labels, buttons, payment methods
3. `ClientList.tsx` — column headers, action buttons
4. `AddClient.tsx` — form labels
5. `Dashboard.tsx` — stat cards, section titles
6. `AppSidebar.tsx` — menu items (যেগুলো এখনো English)
7. `TopBar.tsx` — buttons, search placeholder
8. Common components: `BulkActionButtons`, `BillingFilterPanel`, status badges

**Phase 2 (পরবর্তী request-এ) — Other modules**:
- Accounting, HR, Inventory, Reports, Monitoring, OLT pages
- প্রতিটি module-এর জন্য আলাদা request করতে পারবেন

### Approach

- Hardcoded English strings গুলো সরাসরি Bangla string দিয়ে replace করব (no i18n library এখন)
- Brand names, technical acronyms, code/config keys অপরিবর্তিত রাখব
- Toast messages, error messages, placeholder texts — সব Bangla
- Form validation messages Bangla
- Date/number formatting JavaScript locale `bn-BD` ব্যবহার করব যেখানে সম্ভব (তবে table-এ English digits keep করব readability-র জন্য)

### Files (Phase 1)

| File | Change |
|------|--------|
| `src/pages/dashboard/billing/BillingList.tsx` | Column headers, buttons, toasts → Bangla |
| `src/components/billing/BillReceiveDialog.tsx` | Labels, payment method labels (Cash→ক্যাশ), buttons |
| `src/components/billing/BulkActionButtons.tsx` | Button labels |
| `src/components/billing/BillingFilterPanel.tsx` | Filter labels |
| `src/pages/dashboard/clients/ClientList.tsx` | Headers, buttons, status |
| `src/pages/dashboard/clients/AddClient.tsx` | Form labels, placeholders |
| `src/pages/Dashboard.tsx` | Stat card labels, section titles |
| `src/components/AppSidebar.tsx` | English menu items → Bangla |
| `src/components/TopBar.tsx` | Search placeholder, button labels |
| `src/components/GlobalClientSearch.tsx` | Search placeholder, empty states |

### Note

- Phase 2 শুরু করতে চাইলে শুধু বলবেন "accounting Bangla করো" বা "HR Bangla করো" — তখন ওই module ধরব
- কোনো specific term-এর Bangla পছন্দ না হলে বলবেন, সঠিক করে দেব

