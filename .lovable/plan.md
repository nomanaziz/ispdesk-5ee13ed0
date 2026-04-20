

## লক্ষ্য
Sidebar থেকে অপ্রয়োজনীয় Add/সাব-মেনু item সরিয়ে দেওয়া, এবং সংশ্লিষ্ট list page-এ উপরে "Add" button যোগ করা। **কোনো feature delete হবে না** — শুধু navigation কমানো হবে।

## ১. Sidebar থেকে যেগুলো সরাবো (১৫টি item)

### হোম ক্লায়েন্ট group
- ❌ "নতুন যোগ করুন" (`/dashboard/clients/add`) → Client List-এর উপরে button
- ❌ "বিলিং সাইকেল সেটিংস" → System group-এ সরানো হবে (কম-ব্যবহার)

### POP / MAC ক্লায়েন্ট group
- ❌ "POP যোগ করুন" → already Managers list-এ button আছে
- ❌ "POP ফান্ডিং" + "ফান্ড হিস্ট্রি" → দুটোই sidebar থেকে সরাবো; **POP ম্যানেজার লিস্ট-এ** একটা "Funding ➜" button যোগ — সেখান থেকে Funding page এবং Funding-page-এর উপরে "ফান্ড হিস্ট্রি দেখুন" button

### MikroTik সার্ভার group
- ❌ "MikroTik থেকে ইম্পোর্ট" + "বাল্ক ক্লায়েন্ট ইম্পোর্ট" → Servers list-এর উপরে দুটো button ("Import Users", "Bulk Import")

### HR ও পেরোল group
- ❌ "কর্মচারী যোগ" → already Employees list-এ button আছে
- ❌ "পুনরায় যোগদান" → Resignations page-এ row action হিসেবে accessible; sidebar থেকে সরাবো

### নেটওয়ার্ক মনিটরিং group
- ❌ "সুইচ যোগ করুন" → Switch List উপরে "Add Switch" button (placeholder page; PlaceholderPage retain)
- ❌ "সুইচ তালিকা (legacy)" → confusing duplicate; সরাবো (Switch ম্যানেজমেন্ট থাকবে)

### ইভেন্ট ও ছুটি (duplicate)
- ❌ Sidebar-এ **দুইবার যোগ আছে** (line 230-235 এবং 237-242) — একটা সরাবো

### ছুটি ম্যানেজমেন্ট group
- ❌ "আবেদন" → "অনুমোদন" page-এ tab/button দিয়ে accessible করা; sidebar থেকে সরাবো

### সাপোর্ট ও টিকেটিং group
- ❌ "সাপোর্ট ক্যাটাগরি" → Support Tickets-এর উপরে "ক্যাটাগরি ম্যানেজ" button

### টাস্ক ম্যানেজমেন্ট group
- ❌ "টাস্ক ক্যাটাগরি" → Tasks page-এর উপরে "ক্যাটাগরি ম্যানেজ" button

### ক্রয় group
- ❌ "ভেন্ডর" → Purchases-এর উপরে "ভেন্ডর ম্যানেজ" button (কম-ব্যবহার)

### কনফিগারেশন group
- ❌ "বিভাগ / জেলা / উপজেলা" — তিনটে জিও-লোকেশন একটা **single page**-এ tab করে দেওয়া (`/dashboard/config/locations` — Division/District/Upazila tab) — sidebar-এ একটা item হবে

## ২. List page-এ "Add" button যোগ (নতুন কোড)

| Page | নতুন Button |
|---|---|
| `clients/ClientList.tsx` | `+ নতুন ক্লায়েন্ট` → `/dashboard/clients/add` |
| `branches/Managers.tsx` | ✅ already আছে |
| `branches/Funding.tsx` | `🕘 ফান্ড হিস্ট্রি` → `/dashboard/branches/funding-history` |
| `mikrotik/Servers.tsx` | `📥 Import Users` + `📦 Bulk Import` |
| `monitoring/SwitchList.tsx` | `+ Add Switch` |
| `support/Tickets.tsx` | `📁 ক্যাটাগরি ম্যানেজ` → categories page |
| `tasks/Tasks.tsx` | `📁 ক্যাটাগরি ম্যানেজ` → categories page |
| `purchases/Purchases.tsx` | `🏪 ভেন্ডর` → vendors page |
| `leave/Approval.tsx` | `📝 নতুন আবেদন` → opens apply page/dialog |

Empty-state message: list খালি থাকলে "কোনো এন্ট্রি নেই — উপরের button থেকে যোগ করুন" দেখানো হবে।

## ৩. Locations merge (Division + District + Upazila)
- নতুন wrapper page `src/pages/dashboard/config/Locations.tsx` — ৩টা tab; existing 3 page-এর component reuse
- Sidebar-এ একটা entry: "এলাকা (বিভাগ/জেলা/উপজেলা)"
- পুরাতন routes রাখব backward-compat (redirect to new tab)

## ৪. কী **থাকবেই**
- সব page accessible থাকবে (route delete হবে না)
- Permission system, badges, Quick Settings অপরিবর্তিত
- Reseller portal sidebar এই scope-এর বাইরে

## ফাইল পরিবর্তন

**✏️ Sidebar audit**:
- `src/components/AppSidebar.tsx` — উপরের list অনুসারে items/groups সরানো ও duplicate clean-up

**✏️ List pages-এ button add**:
- `src/pages/dashboard/clients/ClientList.tsx`
- `src/pages/dashboard/branches/Funding.tsx`
- `src/pages/dashboard/mikrotik/Servers.tsx`
- `src/pages/dashboard/monitoring/SwitchList.tsx`
- `src/pages/dashboard/support/Tickets.tsx`
- `src/pages/dashboard/tasks/Tasks.tsx`
- `src/pages/dashboard/purchases/Purchases.tsx`
- `src/pages/dashboard/leave/Approval.tsx`

**➕ নতুন wrapper**:
- `src/pages/dashboard/config/Locations.tsx` (Tabs around Divisions/Districts/Upazilas)
- `src/App.tsx` — route যোগ `/dashboard/config/locations`

## পরিসংখ্যান
- Sidebar item কমবে: **~১৭টা** (১৫ remove + ১ duplicate + ৩ → ১ merge)
- নতুন button যোগ হবে: **৯টা** list page-এ
- কোনো page delete হবে না; সব accessible থাকবে

