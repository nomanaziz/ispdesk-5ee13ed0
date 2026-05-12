## লক্ষ্য

1. **Admin সাইডে** — কোনো BW reseller customer-এর ভিতরে ঢুকলে শুধু invoice/due না, কাস্টমার বর্তমানে কোন কোন সার্ভিস (Internet/IIG, GGC, FNA/FNS, CDN, Facebook Cache, BICS ইত্যাদি) কত Mbps করে নিচ্ছে — সেই **Service Summary** দেখা যাবে।
2. **Reseller (BW Customer) পোর্টালে** — Service Orders পেইজে শুধু একটা generic "Internet Bandwidth" না, latest invoice-এর প্রত্যেকটা line item আলাদা সার্ভিস হিসেবে list হবে। প্রতিটার পাশে current capacity, monthly rate, এবং Upgrade / Downgrade / Discontinue বোতাম থাকবে।

ডাটা সব আগে থেকেই `bw_invoice_items` টেবিলে আছে (`service_name`, `bandwidth_mbps`/`quantity`, `rate`, `amount`)। শুধু UI fix দরকার — কোনো schema/migration লাগবে না।

---

## পরিবর্তন

### 1) `src/pages/dashboard/bw-sale/CustomerView.tsx` (Admin)
- নতুন একটা ট্যাব `"Services"` যোগ করা হবে (Personal Info / Transmission / **Services** / Invoices)।
- Latest invoice (most recent by `created_at`) এর সব `bw_invoice_items` fetch করে aggregate করা হবে — একই `service_name` থাকলে latest entry নেওয়া হবে।
- টেবিল কলাম: SN, Service Name, Bandwidth (Mbps), Monthly Rate, Source Invoice, Period (From–To)।
- Total monthly bandwidth ও total monthly bill footer-এ দেখানো হবে।
- ফলে admin এক নজরেই দেখতে পারবেন কাস্টমার এখন কী কী চালাচ্ছে।

### 2) `src/pages/bw-customer/BwPurchaseOrders.tsx` (Customer Portal)
- বর্তমানের regex-based "Internet Bandwidth" parsing বাদ দেওয়া হবে।
- পরিবর্তে latest invoice-এর সব `bw_invoice_items` থেকে real services derive হবে। প্রতিটা item একটা `CurrentService` হবে:
  - `label`: `service_name` (e.g. "Google Cache (GGC)", "IIG", "FNA", "Facebook Cache" ইত্যাদি)
  - `bandwidth`: `bandwidth_mbps || quantity` Mbps
  - `amount`: monthly rate
  - `source`: invoice_no
- "চলমান সার্ভিস" কার্ডে প্রত্যেক সার্ভিসের জন্য আলাদা row — current capacity দেখানো হবে boldly, এবং প্রতিটার পাশে **Upgrade / Downgrade / Discontinue** বোতাম।
- Upgrade/Downgrade dialog-এ "Current: X Mbps → New: ___ Mbps" pre-fill থাকবে।
- Submit করার সময় অর্ডারের note ও line item-এ কোন সার্ভিসের জন্য request সেটা স্পষ্ট থাকবে (`service_name` সহ)।
- 30-day rule (downgrade/discontinue) আগের মতোই থাকবে।

### 3) (No-op verification) `BwInvoiceDetailDialog.tsx`
- ইতিমধ্যে items render করছে — শুধু কনফার্ম করা যে এটা ঠিকঠাক দেখাচ্ছে; কোডে পরিবর্তন লাগবে না।

---

## ফাইল

- ✏️ `src/pages/dashboard/bw-sale/CustomerView.tsx` — নতুন "Services" ট্যাব যুক্ত
- ✏️ `src/pages/bw-customer/BwPurchaseOrders.tsx` — invoice items থেকে real services list

কোনো DB migration বা backend পরিবর্তন নেই।