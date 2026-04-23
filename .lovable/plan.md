

## পার্চেজ বিল — Duplicate, Item Dropdown ও Manual VAT

### লক্ষ্য
1. প্রতি মাসের bill renew করার জন্য **"Duplicate"** option
2. Manual line item-এর "Service" field-এ **`bw_items` থেকে dropdown** (free-text-এর বদলে)
3. Manual line item-এও **VAT% column** — subscription ছাড়াই VAT সহ বিল করা যাবে

### ১. Bill Duplicate

**`Bills.tsx` (List page) — Action column-এ নতুন button:**
- 📋 **Copy icon** → click করলে confirm dialog
- Confirm করলে: সেই bill-এর সব data (provider, lines, VAT, discount ইত্যাদি) copy করে নতুন bill তৈরি হবে নিচের পরিবর্তন সহ:
  - নতুন `bill_no` auto-generate (`BW-YYYYMM-XXXX`)
  - `billing_month` → পরের মাস
  - `period_start` / `period_end` → পরের মাসের range
  - প্রতিটা line item-এর `period_start`, `period_end`, `days`, `total_days_in_month` → পরের মাসের অনুযায়ী recompute
  - `paid = 0`, `status = unpaid`, `invoice_no = null`, `attachment_url = null`
- সফল হলে নতুন bill-এর edit page-এ redirect (`/dashboard/bw-buy/bills/{newId}`) — user চেক করে save করতে পারবে

**Optional**: List view-এ Duplicate-এর পাশে dropdown — "Next month" / "Same month" যেন user চাইলে একই মাসে copy করতে পারে।

### ২. Item Dropdown in Manual Line

**`BillForm.tsx` পরিবর্তন:**

বর্তমানে `service_name` একটা free-text Input। এটা পাল্টে **Combobox** (search সহ dropdown) বানানো হবে:
- `bw_items` table থেকে সব active items load (filtered by selected provider যদি থাকে, না থাকলে সব)
- User item select করলে auto-fill:
  - `service_name` = item.name
  - `rate` = item.price (যদি থাকে)
  - `bandwidth_mbps` = item.bandwidth থেকে parse (যেমন "100 Mbps" → 100)
  - `service_id` = item.id
- "Custom" option — user চাইলে dropdown-এর বদলে নিজে টাইপ করতে পারবে (current behavior preserved)

**LineItem interface-এ** `service_id` already আছে — শুধু dropdown UI বসাতে হবে।

### ৩. Manual Line-এ VAT Column

পূর্বের approved VAT migration plan এখনো execute হয়নি (database column add করা হয়নি)। এই plan-এ সেটাও include করছি:

**Migration:**
- `bw_buy_bill_items.vat_pct numeric DEFAULT 5`
- `bw_buy_bill_items.vat_amount numeric DEFAULT 0`
- `bw_purchase_bills.subtotal numeric DEFAULT 0`
- `bw_purchase_bills.vat_total numeric DEFAULT 0`
- `bw_providers.default_vat_pct numeric DEFAULT 5`
- `bw_buy_provider_subscriptions.vat_pct numeric DEFAULT 5`
- `bw_items.default_vat_pct numeric DEFAULT 5` (নতুন — item-level VAT default)

**`BillForm.tsx` table-এ নতুন column:**
- "VAT%" — editable number input, default 5
- Item dropdown থেকে select করলে item.default_vat_pct থেকে auto-fill
- Subscription auto-generate করলে subscription.vat_pct থেকে auto-fill
- Manual entry-তে user চাইলে edit করতে পারবে

**`recompute()` update:**
```ts
const base = (mbps × rate × days) / total_days_in_month
const vat = base × vat_pct / 100
amount = base + vat   // total = base + VAT
vat_amount = vat       // saved separately
```

**Footer breakdown** (table-এ):
```
Subtotal:      ৳ XX,XXX
VAT:           ৳ X,XXX
Discount:    − ৳ XXX
─────────────────────
Grand Total:   ৳ XX,XXX
```

### ৪. Items.tsx পরিবর্তন (ছোট)
- Add/Edit dialog-এ "ডিফল্ট VAT %" field (default 5) — যাতে item বানানোর সময়ই VAT সেট করা যায়

### ৫. Files affected
- **Migration** (new): VAT columns + item VAT default
- `src/pages/dashboard/bw-buy/Bills.tsx` — Duplicate button + duplicate handler
- `src/pages/dashboard/bw-buy/BillForm.tsx` — Item dropdown (Combobox), VAT column, totals breakdown, save logic update
- `src/pages/dashboard/bw-buy/Items.tsx` — VAT% field
- `src/lib/bwBuyProrate.ts` — segment-এ vat_pct propagate
- `src/integrations/supabase/types.ts` — auto-update post migration

### ফলাফল

```text
Bills List:
  Bill #001 [👁 View] [✏ Edit] [📋 Duplicate] [🗑 Delete]
                              ↓
              পরের মাসের জন্য একই bill (recomputed dates)

Bill Form — Manual Line:
  Service: [🔍 Internet 100Mbps ▼]   ← bw_items dropdown
           [Custom: ____________]    ← optional override
  Mbps: 100  Rate: 250  Days: 30/30  VAT%: 5  Total: ৳26,250
                                     ↑
                              এখন manual line-এও VAT
  
  ─────────────────────────────────────
  Subtotal: ৳25,000 | VAT: ৳1,250 | Total: ৳26,250
```

