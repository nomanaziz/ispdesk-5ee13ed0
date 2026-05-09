# বিলিং লিস্ট: মোট বকেয়া + ওভারডিউ ফিল্টার

## সমস্যা

1. **ভুল বকেয়া**: লিস্টে nafisa-এর বকেয়া দেখাচ্ছে ৳1,500 (শুধু চলতি মাস May), কিন্তু client detail-এ মোট ৳3,000 (April + May)। আগের মাসের বাকি লিস্টে আসছে না।
2. **ওভারডিউ ফিল্টার নেই**: বর্তমান "overdue" ফিল্টার শুধু `expire_date < today` দেখে — পূর্বের বাকি দিয়ে ফিল্টার করা যায় না।

## সংজ্ঞা (user-confirmed)

- **Overdue**: `total_due ≥ 1` AND `total_due > monthly_bill` (অর্থাৎ চলতি মাসের চেয়ে কমপক্ষে ১ টাকা বেশি বাকি = পূর্বের কোনো মাসের বাকি জমে আছে)
- **Overdue months** = `floor(total_due / monthly_bill)` যখন `monthly_bill > 0`

## পরিকল্পনা

### 1. `src/pages/dashboard/billing/BillingList.tsx`

- ক্লায়েন্ট fetch-এর সময়ে ইতিমধ্যে সব `billing` rows আসছে (`billing!billing_client_id_fkey(...)`)। ক্লায়েন্ট mapping-এ যোগ করব:
  - `totalDue` = `sum(b.due)` সব billing rows-এর
  - `totalPaid` = `sum(b.paid)` সব billing rows
  - `unpaidMonths` = `count(b where b.due > 0)`
  - `overdueMonths` = `monthly_bill > 0 ? floor(totalDue / monthly_bill) : 0`
  - `isOverdue` = `totalDue > monthly_bill && totalDue >= 1`
- "বকেয়া" কলামে দেখাব **মোট বকেয়া** (`totalDue`), নিচে ছোট করে যত মাসের overdue (যেমন `2 মাস`) badge। Tooltip-এ চলতি মাসের আলাদা ভাঙন।
- "পেজ মোট" footer-এ `due` → `totalDue` দিয়ে যোগ।
- Summary card "ওভারডিউ" — নতুন সংজ্ঞা অনুযায়ী count (`isOverdue` true).
- `paymentStatus === "overdue"` ফিল্টারের শর্ত পরিবর্তন: `c.isOverdue`.

### 2. `src/components/billing/BillingFilterPanel.tsx`

- পেমেন্ট স্ট্যাটাস select-এ option যোগ:
  - `overdue_1` — ১+ মাস overdue (যেকোনো overdue)
  - `overdue_2` — ২+ মাস overdue
  - `overdue_3` — ৩+ মাস overdue
  - `overdue_3plus` — ৩ মাসের বেশি
- পুরোনো `overdue` রাখব backward-compat হিসেবে।
- BillingList ফিল্টারিং অনুযায়ী match: `c.overdueMonths >= N`.

### 3. কোন backend/RLS পরিবর্তন নেই

`billing` table থেকে সব row আসছেই — শুধু ফ্রন্টএন্ডে aggregation।

## প্রভাবিত ফাইল

- `src/pages/dashboard/billing/BillingList.tsx`
- `src/components/billing/BillingFilterPanel.tsx`
