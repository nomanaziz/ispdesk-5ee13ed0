

## Client List ও Billing List — Unified Filter, Bulk Actions, Toggle, Bill Receive

৪টি প্রধান কাজ: (1) Filter design unified ও compact, (2) Client List-এ bulk actions কাজ করানো + MikroTik toggle, (3) Billing List-এ MikroTik toggle + Pay/Due buttons, (4) Bill Receive dialog।

---

### 1. Unified Filter — Client List কে BillingFilterPanel ব্যবহার করানো

Client List-এর নিজের inline filter কোড সরিয়ে `BillingFilterPanel` component ব্যবহার করবে। এতে দুই পেজে একই design ও filter options থাকবে।

**BillingFilterPanel compact করা:**
- Filter row-এর select height `h-7` করা হবে (বর্তমান `h-8`)
- Label font `text-[10px]` করা হবে
- Grid `lg:grid-cols-7` করা হবে (বর্তমান `lg:grid-cols-6`)
- Date row 6-column এর বদলে 4-column

### 2. Client List — Bulk Actions কাজ করানো + MikroTik Toggle

**Bulk Actions:** Client List-এর top action buttons (Generate Excel, Bulk Profile Change, Bulk Status Change) এখন কিছু করে না। এগুলো কাজ করাতে:
- Billing List-এর মতো `BulkActionButtons` component ব্যবহার করা হবে
- `handleDisableEnable` function যোগ হবে (Billing List-এ যেভাবে আছে)
- Dialog components (BulkStatusChangeDialog, BulkProfileChangeDialog, etc.) import করা হবে

**MikroTik Toggle Button:** প্রতিটি row-তে M.Status column-এ Badge-এর বদলে `Switch` toggle button বসবে:
- Green = enabled, click করলে → `manage-mikrotik-ppp` action: `disable` call
- Red/off = disabled, click করলে → `manage-mikrotik-ppp` action: `enable` call
- Loading state থাকবে toggle-এ

### 3. Billing List — MikroTik Toggle + Pay/Due Buttons

**MikroTik Toggle:** Client List-এর মতোই `Switch` toggle button — same component।

**Pay/Due Column:** B.Status column-এ:
- Status `paid` হলে → সবুজ "Paid" badge
- Status `unpaid`/`partial` হলে → লাল "Due" badge + "Pay" button
- "Pay" button click করলে → Bill Receive Dialog open

### 4. Bill Receive Dialog — নতুন Component

Screenshot অনুযায়ী `BillReceiveDialog` তৈরি হবে:

**Fields (pre-filled from client + billing data):**

| Left Column | Right Column |
|-------------|-------------|
| Received Date (today default) | User Name (readonly) |
| Client Code (readonly) | Mobile No. (readonly) |
| Package (readonly) | Receive From (client name) |
| Monthly Bill (readonly) | Due Amount (auto-calculated) |
| Received By (current user dropdown) | Payment Method (bKash/Cash/Nagad etc.) |

**Bottom Table (readonly summary):**
- Payable Amount, Discount, Received Amount (editable), VAT Amount (+ Apply VAT checkbox), Total Received Amount, Receipt/Transaction No., Balance Due, Remarks/Note

**Checkboxes:**
- "Set Next Billing Date?" — checked হলে expire_date extend করবে
- "Send SMS?" — checked হলে payment confirmation SMS পাঠাবে

**Submit Logic:**
- `billing` table-এ update: `paid`, `due`, `status`, `pay_date`, `payment_method`, `collected_by`, `vat`, `discount`
- যদি received > due → advance হিসাবে save হবে, remarks-এ "Advance Pay" auto-add
- যদি "Set Next Billing Date" checked → `clients.expire_date` 30 দিন extend
- Data refresh after submit

---

### Files

| File | Change |
|------|--------|
| `src/components/billing/BillingFilterPanel.tsx` | Compact styling (smaller heights, tighter grid) |
| `src/pages/dashboard/clients/ClientList.tsx` | BillingFilterPanel ব্যবহার, bulk actions working, MikroTik toggle |
| `src/pages/dashboard/billing/BillingList.tsx` | MikroTik toggle column, Pay/Due buttons, BillReceiveDialog integration |
| `src/components/billing/BillReceiveDialog.tsx` | **নতুন** — Bill Receive dialog (screenshot অনুযায়ী) |

