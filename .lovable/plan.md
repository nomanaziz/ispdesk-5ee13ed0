

## নতুন পার্চেজ বিল — VAT সাপোর্ট ও মাল্টি-সাবস্ক্রিপশন

### লক্ষ্য
- প্রতিটা প্রোভাইডার/সাবস্ক্রিপশনে VAT% সেট করে রাখা যাবে (ডিফল্ট 5%)।
- বিল তৈরি করার সময় সেই VAT auto আসবে — manual edit-ও করা যাবে।
- একই প্রোভাইডার থেকে একাধিক সাবস্ক্রিপশন একসাথে বিলে যোগ করা যাবে (পিকার দিয়ে multi-select)।
- Subtotal, VAT, Discount, Grand Total — পরিষ্কার breakdown।

### Database পরিবর্তন (Migration)

**`bw_providers` table:**
- `default_vat_pct numeric DEFAULT 5` — প্রোভাইডার-level ডিফল্ট VAT

**`bw_buy_provider_subscriptions` table:**
- `vat_pct numeric DEFAULT 5` — প্রতিটা সাবস্ক্রিপশনে আলাদা override করা যাবে

**`bw_buy_bill_items` table:**
- `vat_pct numeric DEFAULT 0` — বিল লাইনে VAT%
- `vat_amount numeric DEFAULT 0` — calculated VAT টাকা

**`bw_purchase_bills` table:**
- `subtotal numeric DEFAULT 0` — VAT-এর আগের মোট
- `vat_total numeric DEFAULT 0` — সব লাইনের মোট VAT

(সব column nullable/default — পুরোনো rows-এর সাথে compatible।)

### UI পরিবর্তন

**1. `Providers.tsx` — Add/Edit Dialog-এ:**
- নতুন field: "ডিফল্ট VAT %" (number, default 5)

**2. `Subscriptions.tsx` — New Subscription dialog + Change dialog-এ:**
- নতুন field: "VAT %" (number, প্রোভাইডার select করলে provider.default_vat_pct থেকে auto-fill)
- টেবিলে VAT% column যোগ

**3. `BillForm.tsx` — মূল পরিবর্তন:**

a) **Auto-generate flow** (already exists) — এখন `subscription.vat_pct` লাইনে copy হবে।

b) **নতুন "Add Subscription" picker** — manual line-এর পাশাপাশি:
   - Provider select করার পর একটা button "+ সাবস্ক্রিপশন থেকে যোগ করুন"
   - Click করলে Dialog খুলবে — সেই প্রোভাইডারের সব active subscription checkbox list (search সহ)
   - Multi-select করে "Add Selected" → সব selected subscription একসাথে pro-rated line হিসেবে যোগ হবে (VAT সহ)

c) **Line items table-এ নতুন column:** "VAT %" (editable)

d) **Totals breakdown** (table footer-এ):
```
Subtotal:      ৳ XX,XXX
VAT:           ৳ X,XXX
Discount:    − ৳ XXX
─────────────────────
Grand Total:   ৳ XX,XXX
```

e) **Calc helper update** (`recompute`):
```ts
const base = (mbps × rate × days) / total_days_in_month
const vat = base × vat_pct / 100
amount = base + vat   // line total includes VAT
vat_amount = vat       // saved separately
```

### `bwBuyProrate.ts` পরিবর্তন
- `buildBuyBillItems()` → segment-এ `vat_pct` যোগ করবে (subscription থেকে)
- `bandwidthBilling.ts`-এর `BillingSegment` type-এ `vat_pct` field যোগ

### Save logic update
- `bw_buy_bill_items` insert-এ `vat_pct`, `vat_amount` সহ save
- `bw_purchase_bills`-এ `subtotal`, `vat_total`, `total_amount` (=subtotal+vat-discount) save

### ফলাফল

```text
Provider (default VAT 5%)
   ↓
Subscriptions (inherit 5%, override-able)
   ↓
Bill Form:
  ┌─ Provider: BTRC Ltd  [+ subscription থেকে যোগ করুন]
  │  ┌──────────────────────────────────────────┐
  │  │ ☑ Internet — 100 Mbps @ 250 (VAT 5%)     │
  │  │ ☑ NIX — 50 Mbps @ 100 (VAT 5%)            │
  │  │ ☐ Akamai — 30 Mbps @ 80 (VAT 0%)          │
  │  └─────────────────── [Add Selected] ──────┘
  └─ Lines:
     Service │ Mbps │ Rate │ Days │ VAT% │ Total(incl VAT)
     ────────┼──────┼──────┼──────┼──────┼─────────────────
     Internet│ 100  │ 250  │ 30/30│  5   │ ৳26,250
     NIX     │ 50   │ 100  │ 30/30│  5   │ ৳5,250
     ────────────────────────────────────────────────
     Subtotal:  ৳30,000  |  VAT: ৳1,500  |  Total: ৳31,500
```

- যেই কোম্পানি VAT সহ বিক্রি করে — তাদের সাবস্ক্রিপশনে VAT 5% থাকবে → বিলে auto আসবে
- যাদের VAT নেই — সাবস্ক্রিপশন/প্রোভাইডারে 0 দিয়ে রাখলে auto 0 আসবে
- এক প্রোভাইডার থেকে একসাথে একাধিক সাবস্ক্রিপশন এক ক্লিকে যোগ — ক্যালকুলেশন pro-rated + VAT সহ automatic

