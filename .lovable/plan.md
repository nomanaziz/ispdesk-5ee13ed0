

## লক্ষ্য (Goal)

Customer Portal Dashboard-কে আরো সহজ ও পরিচ্ছন্ন করা — ক্লায়েন্টের পূর্ণ নাম প্রাধান্য, duplicate service info সরিয়ে শুধু compact icon-chip strip, এবং reference image থেকে inspire হয়ে একটা **Activity / Quick-info side panel** যোগ।

---

## সমস্যা (এখন কী ভুল আছে)

1. "Welcome back" এর পরে `customer.name` token থেকে আসছে — এটা username/code হয়ে যাচ্ছে যখন pure name token-এ নেই। Profile change request approve হলেও token refresh হয় না।
2. একই তথ্য (Package, Speed, Connection, Protocol) **দু'বার** দেখাচ্ছে — উপরে stat-cards-এ, নিচে "Service Overview" table-এ।
3. Layout ভারী — অনেক জায়গা নিচ্ছে।
4. Ledger / Payment status ছড়ানো — একসাথে নেই।

---

## সমাধান (পরিবর্তন)

### 1. Hero card — পূর্ণ নাম + compact icon strip
- "Welcome back" এর পরে **`clientRow.name` (DB থেকে fresh full name)** দেখাবে, fallback `customer.name`। এতে approved profile-update এর নতুন নাম সাথে সাথে দেখাবে (token refresh ছাড়াই)।
- Hero-এর নিচে এক লাইনে **icon chips strip** — প্রতিটা item শুধু ছোট icon + value, কোনো big card নয়:
  - 👤 Username · 📦 Package · ⚡ Speed · 🔌 Connection · 🛡️ Protocol · 🟢 Status
- বড় ৫টা stat-card grid **সরিয়ে দেওয়া হবে**।

### 2. "Service Overview" card **পুরো remove**
- কারণ সব data ওই icon strip-এই থাকবে।

### 3. "Client Details" card — শুধু এটাই থাকবে (কারণ এগুলোই unique info)
- Customer Code, Name, Mobile, Email, Present Address, Zone, NID
- উপরের image-এর "Client Code / Log In ID / User ID / Status / Registration Date" পদ্ধতির মতো — small label + icon prefix, পরিচ্ছন্ন column।

### 4. নতুন **"Activity & Ledger" side panel** (reference image-এর Activity panel concept থেকে)
Right-side small card, design নতুন (image-এর design copy নয়), এতে থাকবে:
- **Your ID/Username** (chip)
- **Last Login** (portal_login_log থেকে)
- **Ledger Balance / Due** — বড় highlighted number, "Pay Now" button সহ
- **Last Invoice** (#bill_id + month + status badge)
- Quick links: Change Password · My Profile · Notices

Mobile (390px) — side panel hero-এর ঠিক নিচে full-width হয়ে আসবে; desktop-এ Client Details-এর পাশে 2-col grid।

### 5. Notice banner — অপরিবর্তিত (উপরে থাকবে)।

---

## Technical Details

**File: `src/pages/portal/PortalDashboard.tsx`** (একমাত্র file edit)

- Hero name source: `clientRow?.name || customer?.name` (DB priority)।
- `stats` array এবং stat-card grid (lines 47–53, 117–134) — **delete**।
- "Service Overview" Card (lines 137–156) — **delete**।
- Hero-এর ঠিক পরে নতুন `IconChipStrip` component — flex-wrap, prim-bg-foreground tone (dark text per existing memory), colorful icons (icon-গুলো colorful — recent পরিবর্তনের সাথে consistent)।
- Bottom grid: 2-col (lg) — left = Client Details (current card retained); right = নতুন `ActivityLedgerPanel`।
- Last login data: `data?.last_login` field — `portal-data` `get_dashboard` already returns? **Check needed** — যদি না থাকে, frontend থেকে আলাদা query করব না; বরং `customer.iat` কে fallback "this session" হিসেবে দেখাবো এবং `portal-data/get_dashboard`-এ `last_login` যোগ করব (1 line: `portal_login_log` থেকে previous এন্ট্রি pull)।

**File: `supabase/functions/portal-data/index.ts`** (minor — `get_dashboard` response-এ `last_login` field যোগ করা — only if missing)।

---

## Out of scope (এই কাজে নয়)

- Reference image-এর exact dark-blue sidebar / Galaxy Net branding copy — শুধু *concept* (Activity panel idea) নেওয়া হচ্ছে।
- Profile page redesign।
- Token refresh flow।

---

## Apply-এর পরে expected

1. Hero-এ ক্লায়েন্টের পূর্ণ নাম (approved DB name)।
2. Service info শুধু এক লাইনে compact colorful icon chips — duplicate table নেই।
3. Client Details + নতুন Activity/Ledger panel side-by-side (mobile-এ stacked)।
4. Mobile (390px) এ পরিচ্ছন্ন, কম scroll।

