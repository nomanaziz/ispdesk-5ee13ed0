

## লক্ষ্য
MAC Reseller Funding-এ Refund logic ঠিক করা + View Detail dialog (image-162) + Safe Delete যোগ করা।

## ১. Refund — POP-এর available balance-এর মধ্যে সীমিত

**বর্তমান সমস্যা**: `FundingPayDialog`-এ row-এর `Refund` button চাপলে যেকোনো amount refund করা যায় — POP balance check হয় না। ফলে POP যদি ১০০০ টাকা পেয়ে ৮০০ খরচ করে ফেলে, তবুও ১০০০ refund করা সম্ভব → balance negative হয়।

**নতুন rule**: Refund amount ≤ POP-এর current `branch_managers.balance`। (নির্দিষ্ট invoice-এর সাথে refund-এর কোনো বাঁধাধরা সম্পর্ক নেই — POP-এর available balance থেকেই refund হয়।)

**পরিবর্তন `FundingPayDialog.tsx` — refund mode-এ**:
- Dialog open হলে POP-এর live balance fetch (`branch_managers.balance` by `branch_id`)
- "Available Balance" badge দেখানো (সবুজ যদি > 0, লাল যদি ০)
- Amount input-এ `max = availableBalance`
- Submit-এ guard: `amount > availableBalance` হলে error: *"POP-এর available balance ৳X — এর বেশি refund করা যাবে না"*
- Available = ০ হলে Refund button disabled + message: *"এই POP-এর কোনো অবশিষ্ট balance নেই, refund সম্ভব নয়"*
- Refund insert-এ remarks-এ source invoice number রাখা হবে (audit trail)

## ২. View Detail Dialog (image-162 অনুসারে)

বর্তমানে 👁 button কাজ করে না। নতুন **`FundingDetailDialog.tsx`** (separate component):

**Title**: `Debited Transaction History Of: {invoice_number}`

**Top section** — invoice summary card:
- Reseller Name, Invoice, Fund Date, Created By

**Inner table** — এই invoice-এর বিরুদ্ধে যত pay/refund entry হয়েছে:

| Sr. | Reseller Name | Paid Amount | Discount | Refund(-) | Transaction Type | Created On | Created By | Action |
|---|---|---|---|---|---|---|---|---|

**Footer totals row**: Total Fund | Total Payment | Total Discount | Total Due

**Data source**: 
- বর্তমান schema-এ pay events আলাদা row হিসেবে stored হয় না — `branch_funding` row update হয়। তাই view dialog-এ:
  - Original fund row → সর্বদা ১ম row (TransactionType = "Fund")
  - Refund rows → same `branch_id`-এ `trans_type='refund'` rows যেগুলোর remarks-এ এই invoice mentioned আছে
  - Pay updates → row-এর remarks-এ `[Pay ৳X on date]` log থেকে parse করে timeline দেখানো (existing log format already exists)

**Action column** in inner table:
- শুধু refund row-এর জন্য 🗑 delete button — চাপলে confirm: refund delete হলে POP balance সমপরিমাণ বাড়ানো হবে (refund undo)
- Original fund row-এ delete button থাকবে না এই inner table-এ

## ৩. Safe Delete (main table-এর 🗑 button)

**নিয়ম**: একটা funding entry তখনই delete করা যাবে যখন তার বিরুদ্ধে কোনো received payment বা refund history নেই।

**Block condition** (যেকোনো একটা true হলে delete বন্ধ):
- `received_amount > 0` (কেউ কিছু pay করেছে)
- Same `branch_id`-এ এই invoice number reference করে কোনো refund row exists
- Row নিজেই refund (refund rows আলাদাভাবে detail dialog থেকে delete হবে)

**Block হলে toast**: *"এই entry-র সাথে যুক্ত পেমেন্ট/রিফান্ড history আছে — আগে detail view থেকে সব sub-entry মুছুন, তারপর এটি delete করতে পারবেন"*

**Allow হলে confirm dialog**:  
*"এই Fund entry delete করলে POP balance ৳{amount} কমানো হবে। নিশ্চিত?"*

**Implementation**: existing `apply_branch_funding_to_balance` trigger শুধু INSERT-এ চলে। Delete-এ balance reverse করার জন্য নতুন **AFTER DELETE trigger** যোগ করতে হবে যেটা:
- যদি deleted row `trans_type='fund'` → `branch_managers.balance -= amount`
- যদি deleted row `trans_type='refund'` → `branch_managers.balance += amount`

## Files Changed

**Migration** (নতুন trigger):
- `apply_branch_funding_delete_to_balance()` function + `AFTER DELETE` trigger on `branch_funding`

**Code**:
- ✏️ `src/components/branches/FundingPayDialog.tsx` — refund-এ POP balance fetch + cap + disabled state
- ➕ `src/components/branches/FundingDetailDialog.tsx` — নতুন view dialog (image-162 layout)
- ✏️ `src/pages/dashboard/branches/Funding.tsx`:
  - 👁 button → `FundingDetailDialog` open
  - 🗑 button → safe delete check + confirm dialog
  - "View" eye icon row-এ যুক্ত করা (যদি না থাকে)

## কী **হবে না**
- Pay events-এর জন্য আলাদা history table তৈরি হবে না (existing remarks log + refund rows যথেষ্ট)
- পুরাতন invoice-এ retroactive sub-entry generation নেই
- Refund-কে কোনো নির্দিষ্ট fund invoice-এর সাথে hard-link করা হবে না — শুধু POP-এর overall balance-এ কাজ করবে

