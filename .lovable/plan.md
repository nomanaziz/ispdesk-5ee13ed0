আমি ডাটাবেসে `BW-01021309` চেক করেছি: ইনভয়েসে ৩টা line item আছে — IIG 100 Mbps ৳16,000, FNA 400 Mbps ৳12,000, Google Cache (GGC) 600 Mbps ৳15,000; মোট ৳43,000। UI-তে না দেখানোর কারণ হলো portal user custom login token ব্যবহার করে, Supabase authenticated session না; তাই `bw_invoice_items` এবং `system_settings` query RLS-এর কারণে empty/error হয়ে যাচ্ছে, কিন্তু code error দেখাচ্ছে না।

## Plan

1. **Invoice service items visible করা**
   - `bw_invoice_items` সরাসরি frontend থেকে query না করে একটি safe database RPC/view ব্যবহার করব।
   - `/bw/invoices/:id` invoice detail page এবং print page এই safe source থেকে line items নেবে।
   - Empty হলে silent “No items” না দেখিয়ে actual error/empty state পরিষ্কারভাবে দেখাবে।

2. **Service Orders page fix করা**
   - `BwPurchaseOrders.tsx` latest invoice fetch করার পর একই safe invoice-items source ব্যবহার করবে।
   - ফলে “কোনো সক্রিয় ইনভয়েস/সার্ভিস পাওয়া যায়নি” দেখাবে না; IIG/FNA/GGC সহ current capacity, monthly amount, invoice no দেখাবে।
   - Upgrade / Downgrade / Discontinue button আগের মতো প্রতি service row-তে থাকবে।

3. **Payment gateway fix করা**
   - `usePaymentGateways.ts` আর `system_settings` সরাসরি read করবে না।
   - আগে থেকে থাকা secure RPC `public_payment_gateways()` ব্যবহার করবে, যেটা active + website-visible gateway গুলো safe fields সহ return করে।
   - এতে reseller/BW portal-এ bKash Personal, Nagad Personal, RechargeServer ইত্যাদি দেখা যাবে; personal number থাকলে number দেখাবে।

4. **Query error handling যোগ করা**
   - Invoice item বা gateway query fail করলে empty ধরে “admin contact” দেখাবে না।
   - Console/log-friendly error এবং user-facing clear message থাকবে, যাতে পরেরবার একই issue silent না থাকে।

## Technical details

- Required DB change: add/grant a safe read function for BW invoice item lines, because portal users are anonymous to Supabase RLS.
- Frontend files to update:
  - `src/hooks/usePaymentGateways.ts`
  - `src/pages/bw-customer/BwPurchaseOrders.tsx`
  - `src/pages/reseller/ResellerInvoiceDetail.tsx`
  - `src/pages/reseller/ResellerInvoicePrint.tsx`
- No invoice data migration needed; `BW-01021309` data already exists.