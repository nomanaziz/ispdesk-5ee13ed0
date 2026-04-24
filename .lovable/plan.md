
# Assets Module — Full Implementation Plan

`AssetList` ও `Destroyed Items` দুটো page এখন placeholder। আমি industry-standard Asset Management বানাবো, এবং প্রতিটি action automatic-ভাবে accounting (Cash Book / Expense) hit করবে।

---

## ১. Asset List Page (`/dashboard/assets`)

ISP/Office-এর সব physical asset এখানে register হবে — Router, Switch, OLT, Generator, AC, Computer, Furniture, Vehicle, Tools ইত্যাদি।

### Features
- **Stat cards**: মোট Asset সংখ্যা, মোট Asset মূল্য (৳), Active, Assigned, Destroyed
- **Add Asset dialog** এ থাকবে:
  - Name, Code (auto/manual), Category (dropdown: Network Equipment, IT Equipment, Furniture, Vehicle, Tools, Generator, AC, Other)
  - Purchase Date, Purchase Price (৳)
  - Location, Assigned To (employee dropdown — optional)
  - Status: Active / In Repair / Idle
  - **Payment Method** (Cash / Bank / bKash / Nagad / Card) — accounting এর জন্য
  - Notes
- **Filter / Search**: name, code, category, status
- **Edit / Delete** action
- **Assign / Unassign** quick action (আগে থেকেই `asset_assignments` table আছে, ভবিষ্যতে এটা integrate করা যাবে — এখন basic assigned_to দিয়েই কাজ চালাবো)

### Auto Accounting Hit (নতুন asset add করলে)
Purchase Price > 0 হলে automatically `expense_entries` table-এ একটি row insert হবে:
- `category`: "Equipment"
- `description`: "Asset Purchase: <name>"
- `amount`: purchase_price
- `payment_method`: form থেকে
- `reference`: `asset:<asset_id>`
- `expense_date`: purchase_date

→ এর ফলে **Cash Book** automatically hit হবে (কারণ `CashBook.tsx` আগে থেকেই `expense_entries` থেকে data টানে), এবং Cash balance কমে যাবে। যদি Cash না থাকে, balance minus-এ যাবে — যেটা আপনি চেয়েছেন।

Asset delete করলে corresponding expense entry-ও delete হবে (reference দিয়ে match করে)।

---

## ২. Destroyed Items Page (`/dashboard/assets/destroyed`)

কোনো ONU, Router, Generator, Cable নষ্ট হলে এখানে log হবে — full write-off হিসেবে।

### Features
- **Stat cards**: মোট Destroyed item, মোট ক্ষতি মূল্য (৳), এই মাসে destroyed
- **Add Destroyed Item dialog**:
  - **Source toggle**:
    - **From existing Asset** → existing Asset dropdown (filtered: status ≠ destroyed) → পরিচয় auto-fill হবে
    - **Custom item** (যেমন ONU/cable যেটা assets table-এ নেই) → manual: item_name, estimated value
  - Destroy Date, Reason (text), Loss Amount (৳)
- **Table**: তারিখ, item, কারণ, ক্ষতি মূল্য, কে destroy করেছে, action
- Edit / Delete

### Auto Accounting Hit (item destroy করলে)
1. যদি existing asset হয় → `assets.status = 'destroyed'` set হবে
2. Loss Amount > 0 হলে `expense_entries`-এ row insert:
   - `category`: "Loss / Write-off"
   - `description`: "Destroyed: <item_name> — <reason>"
   - `amount`: loss_amount
   - `payment_method`: "Adjustment" (cash flow নেই, just book loss)
   - `reference`: `destroyed:<destroyed_id>`

→ এতে P&L-এ loss reflect হবে কিন্তু cash book-এ "Adjustment" হিসেবে show করবে (কারণ physical টাকা যায়নি, শুধু book value কমেছে)।

Destroyed entry delete করলে: expense reverse হবে এবং (যদি asset হয়) status আবার `active` হবে।

---

## ৩. Technical Details

### Files to create/edit
- ✏️ `src/pages/dashboard/assets/AssetList.tsx` — full rewrite (placeholder → full page)
- ✏️ `src/pages/dashboard/assets/Destroyed.tsx` — full rewrite

### Database
**কোনো schema migration লাগবে না** — সব table আগে থেকেই আছে:
- `assets` (id, name, code, category, purchase_date, purchase_price, location, assigned_to, status)
- `destroyed_items` (id, asset_id, item_name, destroy_date, reason, destroyed_by)
- `expense_entries` (অলরেডি accounting এর জন্য use হচ্ছে)

RLS policies already enabled — admin/super_admin manage করতে পারবে, authenticated users view করতে পারবে।

**একটি ছোট addition দরকার** `destroyed_items` table-এ: `loss_amount numeric DEFAULT 0` column — যাতে ক্ষতি মূল্য store করা যায়। এটার জন্য একটা migration লাগবে।

### Pattern
`Expense.tsx`-এর exact same pattern follow করব — React Query, shadcn Dialog, Table, Toast, Bangla labels।

### Accounting flow (summary)

```text
Asset Add (purchase price > 0)
    └─> insert expense_entries (category=Equipment, ref=asset:<id>)
            └─> CashBook auto-detects → Cash balance ↓

Asset Delete
    └─> delete expense_entries WHERE reference='asset:<id>'

Item Destroyed (loss > 0)
    ├─> assets.status = 'destroyed' (if linked)
    └─> insert expense_entries (category=Loss, ref=destroyed:<id>)
            └─> P&L shows loss

Destroyed Delete
    ├─> assets.status = 'active' (revert)
    └─> delete expense_entries WHERE reference='destroyed:<id>'
```

---

## ৪. মূল প্রতিশ্রুতি (User Requirements Mapping)

| আপনার চাওয়া | কীভাবে হবে |
|---|---|
| Asset add | Asset List page-এ full form |
| Destroyed item add | Destroyed page-এ form (existing asset বা custom) |
| Account hit হবে | Auto `expense_entries` insert |
| টাকা cash থেকে আসবে | payment_method = Cash → Cash Book auto deduct |
| Cash minus/plus যেতে পারে | কোনো restriction নেই — যেকোনো amount allow |
| Industry standard | Code/Category/Location/Assignment/Status সব included |

Approve করলে আমি দুটি page বানিয়ে, ছোট migration (`loss_amount` column) দিয়ে শেষ করব।
