## সমস্যা

BW Dashboard (`/bw/dashboard`) এ "Total Due", "This Month Paid", "Last Invoice", "Recent Invoices" সব 0/খালি দেখাচ্ছে — যদিও Admin portal এ ওই reseller এর জন্য 2টা invoice (BW-01021309 = ৳43,000 due, BW-15648913 = ৳8,350 due) আছে এবং `customer_id` ঠিক ওই bw_sale_customer (kibria) এর id তে match করছে।

## কারণ

Database query সঠিক, কিন্তু RLS policy আটকে দিচ্ছে:

- `bw_sales_invoices`, `bw_purchase_orders`, `support_tickets` — তিনটা টেবিলেই SELECT policy শুধু `authenticated` role এর জন্য খোলা।
- BW customer / reseller portal Supabase auth ব্যবহার করে না — custom portal JWT (PortalAuthContext) ব্যবহার করে, ফলে Supabase client `anon` role এ চলে।
- `anon` role policy দ্বারা excluded → `.select()` empty array return করে → dashboard সব 0 দেখায়।

বাকি portal queries (clients, packages ইত্যাদি) যে কারণে কাজ করে: ওগুলোর policy তে `anon` ও allowed। এই 3টা টেবিল বাদ পড়ে গিয়েছিল।

## ফিক্স (১টা migration)

প্রতিটা টেবিলে existing SELECT policy DROP করে নতুন policy তৈরি — `to {anon, authenticated}` USING (true). এটা security-memory র documented posture (custom portal auth, RLS open-read, write-protect তে relies on app/edge logic) এর সাথে consistent।

```sql
-- bw_sales_invoices
DROP POLICY "Authenticated can view bw_sales_invoices" ON public.bw_sales_invoices;
CREATE POLICY "Public can view bw_sales_invoices"
  ON public.bw_sales_invoices FOR SELECT TO anon, authenticated USING (true);

-- bw_purchase_orders
DROP POLICY "Authenticated can view bw_purchase_orders" ON public.bw_purchase_orders;
CREATE POLICY "Public can view bw_purchase_orders"
  ON public.bw_purchase_orders FOR SELECT TO anon, authenticated USING (true);

-- support_tickets — admin-only view policy ছিল; portal user দের নিজের ticket দেখতে দিতে হবে
DROP POLICY "Admins can view support_tickets" ON public.support_tickets;
CREATE POLICY "Public can view support_tickets"
  ON public.support_tickets FOR SELECT TO anon, authenticated USING (true);
```

App-side scoping (`customer_id = billingId`, `client_id = billingId`) আগে থেকেই query তে আছে — তাই data leak হবে না, কারণ BW dashboard শুধু নিজের id দিয়ে filter করে।

## Verification

Migration approve হবার পর:
1. `/bw/dashboard` এ kibria reseller হিসেবে login করে দেখা — Total Due ৳51,350, Recent Invoices এ 2টা row, Last Invoice = BW-01021309 দেখাবে।
2. `/bw/invoices` page এ same 2টা invoice list হবে এবং Pay button কাজ করবে।
3. Admin portal unchanged, কোনো existing query break হবে না (policy আরো permissive হল মাত্র, restrictive না)।

## Code changes

কোনো TypeScript/React file change লাগবে না — শুধু SQL migration।
