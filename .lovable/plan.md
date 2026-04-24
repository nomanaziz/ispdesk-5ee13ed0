

## BW Sale Customers — Client Count Column + Panel Income Source

### দুটো জিনিস যোগ করব

**1. POP Customers list-এ "Number of Clients" column**

`src/pages/dashboard/bw-sale/BwSaleCustomers.tsx`-এ existing table-এর শেষে নতুন column:

```
Customer | Status | ... | Number of Clients
─────────────────────────────────────────────
Demo BW  | active | ... | 125 clients
ABC ISP  | active | ... | Not applicable
```

Logic:
- `panel_access_enabled = true` → দেখাবে `active_client_count` value (already maintained by trigger from previous round) সাথে current tier badge (P#1/P#2/P#3)।
- `panel_access_enabled = false` → দেখাবে muted "Not applicable" text।

কোনো নতুন query দরকার নেই — `bw_sale_customers` row-এই `active_client_count` এবং `current_tier_id` আছে।

---

**2. Cash Book-এ নতুন Income Source: "Income from Panel/Portal"**

বর্তমান income sources (codebase-এ check করেছি):
- `client_billing` — ক্লায়েন্ট বিলিং
- `mac_reseller` — ম্যাক রিসেলার
- `bandwidth_sale` — ব্যান্ডউইথ সেল

নতুন যোগ হবে:
- `panel_subscription` — **প্যানেল সাবস্ক্রিপশন (BW Customer Portal)**

পরিবর্তন:
- `src/pages/dashboard/reports/Financial.tsx` ও অন্যান্য income display জায়গায় SOURCES map-এ নতুন entry।
- Income entry form / dropdown-এ নতুন option।
- `bw-panel-monthly-billing` edge function update — bill generate হলে সাথে সাথে `income_entries` table-এ একটা entry insert করবে `source = 'panel_subscription'` দিয়ে। Customer-এর paid status update হলে এটা trigger হবে (অথবা cron যখন bill generate করে তখনই pending-এর জন্য আলাদা ভাবে confirm-on-payment)।

**Recommended flow:** bill generate হবে → customer pay করলে → তখন `income_entries`-এ row যাবে। এতে cash book-এ শুধু actual collected amount দেখাবে।

এর জন্য নতুন একটা small handler/trigger:
- `bw_panel_subscriptions` table-এ `status` column `pending` থেকে `paid` হলে → auto-insert into `income_entries` with source `panel_subscription`, amount = `paid_amount`, branch_id = admin/HQ branch।

---

### Files to change

| File | Change |
|------|--------|
| `src/pages/dashboard/bw-sale/BwSaleCustomers.tsx` | Add "Number of Clients" column with tier badge / "Not applicable" |
| `src/pages/dashboard/reports/Financial.tsx` | Add `panel_subscription` to SOURCES map |
| Income entry form (wherever source dropdown exists) | Add new option |
| DB migration | New trigger on `bw_panel_subscriptions` for status→paid auto income entry |

---

### Outcome

- Admin POP Customers list-এ এক নজরে দেখবে কে panel নিয়েছে এবং তার কতজন client আছে।
- প্রতিটি paid panel subscription auto cash book-এর income হিসেবে track হবে — admin-এর portal-এর আয় visible হবে।
- Existing financial reports ("Income from Panel" filter দিয়ে) এই revenue stream আলাদা করে দেখা যাবে।

