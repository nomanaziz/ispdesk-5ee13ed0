

## নাইম + নোমান — billing/MikroTik সমস্যা fix plan

### এখন database-এ আসল চিত্র

| Client | monthly_bill | এপ্রিল billing | DB mikrotik_status | expire_date |
|---|---|---|---|---|
| **Naim N.A.M** | 500 | paid=0, due=500, status=unpaid | **enabled** | 2026-05-10 (future) |
| **Noman** | 1500 | paid=0, due=1500, status=unpaid | enabled | 2026-04-24 |

আর `billing_enforcement_runs` শেষ run-এ Naim-কে **`skipped_future_expire`** করেছে — কারণ তার `expire_date` future-এ। তাই MikroTik-এ enabled থাকা সঠিক — কিন্তু UI-তে মাসিক বিল row-এ "বকেয়া" red color এসেছে কারণ April bill unpaid।

আপনি যেটা “পরিশোধিত ৬০০ টাকা ৫০০ টাকার বিলে” দেখেছেন — সেটা **overpayment bug**। `BillReceiveDialog`-এ ৫০০ টাকার বিলে ৬০০ গ্রহণ করলে: `paid=600`, `due=0`, `advance=100`, `status="paid"` হিসাবে save হয় — যা আপনার rule-এর বিপরীত।

আপনার rule: *“যতক্ষণ due আছে, পরিশোধ button থাকবে। মাসিক বিল = ৫০০ হলে ৬০০ কখনোই আসবে না — invoice update হলে ওই মাসের amount-ই ৬০০ হবে, পরের মাস আগের মতো ৫০০।”*

---

## ৩টা মূল সমস্যা ও fix

### সমস্যা ১ — Overpayment করলে false "পরিশোধিত" দেখায়
**File:** `src/components/billing/BillReceiveDialog.tsx`

#### Rule (নতুন)
- যদি `totalReceived > dueAmount` (মানে user বেশি গ্রহণ করতে চাইছে), তাহলে:
  - **দুটো option** dialog-এ দেখাব (radio):
    - **Option A — “এই মাসের বিল বাড়িয়ে দিন”** (default, আপনার rule)  
      → `billing.amount = paid` (৬০০), `due = 0`, `advance = 0`, `status = "paid"`  
      → পরের মাসের bill normally `monthly_bill` (৫০০) থেকে generate হবে — কোনো প্রভাব নেই
    - **Option B — “অগ্রিম হিসেবে রাখুন”** (existing behavior)  
      → বর্তমান logic অপরিবর্তিত
  - default = **Option A** (আপনার preferred behavior)
- যদি `totalReceived <= dueAmount` → কোনো option দেখাব না, এখনকার মতো কাজ করবে

#### Validation
- `receivedAmount` input-এ max হিসেবে কোনো hard limit থাকবে না, কিন্তু overpayment হলে option panel দেখাব
- Save করার সময় Option A হলে `billing.amount` update করব receive amount-এর সমান

---

### সমস্যা ২ — DB ও MikroTik-এর `mikrotik_status` mismatch
**Files:**
- `src/pages/dashboard/billing/BillingList.tsx` (MikrotikToggle)
- `supabase/functions/fetch-mikrotik-ppp/index.ts`

#### কারণ
- DB-তে `mikrotik_status=disabled` থাকলেও আসল RouterOS-এ `disabled=no` থাকতে পারে — কারণ:
  - কেউ MikroTik-এ manually enable করেছে
  - আগে enforcement script blindly DB update করেছিল (now fixed, but old data এখনো mismatched)
  - sync শুধু online/offline check করে, status verify করে না (actually করে — fetch-mikrotik-ppp-এ আছে, কিন্তু শুধু `sync-online` action call হলে)

#### Fix
1. **Billing list-এর `Sync Clients` button** এমনিতে `sync-online` call করে — সেটা `mikrotik_status`-ও সঠিকভাবে reconcile করে। ভাল।
2. **MikrotikToggle component** (line 569)-এ toggle করলে সাথে সাথে real RouterOS state read করে DB-তে পরের refresh-এ সঠিক value পড়ার নিশ্চয়তা যোগ করব — `manage-mikrotik-ppp` function থেকে success পাওয়ার পর verify call করব।
3. **billing list table-এ একটি ছোট warning indicator** যোগ করব: যদি client-এর `mikrotik_status` change হয়েছে কিন্তু last sync 1 hour-এর বেশি পুরোনো, একটা ছোট ⚠ tooltip দেখাব “Sync করুন” — optional, simple।
4. সবচেয়ে practical fix: এখনকার যে mismatched rows আছে, একটা **Sync বাটন press করলেই** সব ঠিক হবে। এটা আপনাকে জানাব।

#### বর্তমান mismatched data manually fix
Naim-এর DB-তে `mikrotik_status=enabled` (সঠিক)। আপনি বললেন software disabled দেখাচ্ছে — সম্ভবত cache/পুরনো screenshot। verify করতে আপনি Billing list-এ গিয়ে **“Sync Clients”** button press করুন একবার — সব mismatch ঠিক হয়ে যাবে।

---

### সমস্যা ৩ — Red “expired” color দেখাচ্ছে যখন বিল paid (Noman case)
আপনি বললেন: “নোমানের date বাড়ায় দেওয়া হইছে এটা চলতেছে”। কিন্তু DB অনুযায়ী Noman-এর April bill **unpaid**, due=1500, expire_date=2026-04-24 (আজ)। তাই red color সঠিক — bill paid হয়নি।

যদি আপনি কাউকে `expire_date` extend করেছেন, তাহলে **automatically corresponding billing row-এর জন্য কিছু করা হয়নি** — এটাই সমস্যা।

#### Fix (Bulk Date Extend dialog)
**File:** `src/components/billing/BulkDateExtendDialog.tsx` (already exists)
- Date extend করার সময় optional checkbox যোগ করব: **“এই মাসের বিল paid mark করুন”** — যদি user এটা check করে, current month-এর `billing` row-তে `due=0, paid=amount, status='paid'` set করব (without creating income entry — কারণ এটা waiver/extension)।
- এতে red color চলে যাবে।

---

## কী implement করব

| File | কাজ |
|---|---|
| `src/components/billing/BillReceiveDialog.tsx` | Overpayment radio option (amount বাড়াবেন vs advance), default = amount বাড়াবেন |
| `src/components/billing/BulkDateExtendDialog.tsx` | "এই মাসের বিল paid mark করুন" optional checkbox |
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | মাঝে মাঝে full status sync auto-run নিশ্চিত করব (ছোট safeguard) |

DB schema change লাগবে না।

---

## Expected outcome

- ৫০০ টাকার বিলে ৬০০ গ্রহণ করলে → বিল amount **৬০০** হবে, due=0, status=paid; পরের মাস আবার ৫০০
- কেউ ৪০০ গ্রহণ করলে → due=১০০, status=আংশিক, পরিশোধ button থাকবে
- Noman-এর মতো client-এর date extend করলে চাইলে current bill paid mark করতে পারবেন → red চলে যাবে
- Sync বাটন press করলে DB-RouterOS mismatch ঠিক হবে — Naim-এর case automatically resolve হবে

