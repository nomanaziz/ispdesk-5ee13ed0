

## "দ্রুত ক্লায়েন্ট তৈরি" (Quick Create Client) সম্পূর্ণ সরানো — POP Admin Portal থেকে

### লক্ষ্য
POP Admin portal-এ যেখানেই "Quick Create Client" / `QuickCreateClientDialog` আছে, সব trigger সরিয়ে দেবো। Admin portal-এ যদি থাকে, সেটা **অটুট রাখবো** (user শুধু POP-এর কথা বলেছেন, কিন্তু component-টা যেহেতু shared, আমি POP-side trigger গুলোই disable করবো এবং component file নিজেই রেখে দেবো যাতে Admin-এর কিছু না ভাঙে)।

### পরিকল্পিত পরিবর্তন

আমি প্রথমে কোডবেইসে `QuickCreateClientDialog` এর সব usage খুঁজে বের করবো (`code--search_files`), বিশেষ করে:
- `ResellerLayout.tsx` / `ResellerMobileShell.tsx` (POP sidebar / mobile FAB)
- `ResellerDashboard.tsx` (POP dashboard quick action)
- যেকোনো POP-related page যেখানে এই dialog open করার button আছে

তারপর প্রতিটি POP-context ফাইল থেকে:
1. `<QuickCreateClientDialog ... />` JSX সরাবো
2. সংশ্লিষ্ট state (`const [quickOpen, setQuickOpen] = useState(false)`) সরাবো
3. ওই dialog খোলার button/menu-item/FAB সরাবো
4. unused import সরাবো

### Files যেগুলো edit হবে (প্রাথমিক estimate — exploration-এর পর confirm হবে)

| File | পরিবর্তন |
|------|----------|
| `src/components/ResellerLayout.tsx` | QuickCreate trigger + import সরানো |
| `src/components/reseller/mobile/ResellerMobileShell.tsx` | mobile FAB / trigger থাকলে সরানো |
| `src/pages/reseller/ResellerDashboard.tsx` | Quick Create button + dialog mount সরানো |
| অন্য কোনো POP page যেখানে usage পাওয়া যাবে | একই pattern |
| `src/components/QuickCreateClientDialog.tsx` | **অপরিবর্তিত রেখে দেবো** (Admin-side ব্যবহারের জন্য safe থাকবে; কেউ use না করলে dead code হবে কিন্তু কিছু ভাঙবে না) |

### POP user-এর জন্য বিকল্প
নতুন client তৈরি করতে POP admin "Add Client" পূর্ণ ফর্ম (`/pop-admin/clients/add`) ব্যবহার করবেন — যেটা ইতিমধ্যে কাজ করছে।

### প্রতিশ্রুতি
- POP portal থেকে "দ্রুত ক্লায়েন্ট তৈরি" সব entry-point (sidebar, FAB, dashboard, যেকোনো page) সরে যাবে
- Admin portal-এর কোনো feature ভাঙবে না
- `/pop-admin/clients/add` (Full Form) আগের মতই কাজ করবে

