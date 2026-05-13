আমি এইভাবে ঠিক করব:

1. **POP/Bandwidth admin portal থেকে আলাদা support-ticket option সরাব**
   - `/pop-admin` sidebar থেকে “Support Tickets / Client Tickets” group remove করব।
   - mobile POP home থেকে “Tickets” shortcut এবং ticket summary card/query remove করব।
   - `/pop-admin/tickets` route-এ কেউ direct ঢুকলে dashboard-এ redirect করব, যাতে আলাদা ticketing page আর না থাকে।
   - permission UI-তে “Support Tickets” আলাদা permission থাকলে সেটাও লুকাব/অকার্যকর করব, যেন reseller sub-user setup-এ confusing option না থাকে।

2. **BW customer panel-এর duplicate support-ticket menu সরাব**
   - bandwidth customer/base portal-এ already billing/service-order/support overlap আছে, তাই “Support Tickets” standalone group remove করব।
   - BW panel mode-এর “Client Support / Support History” আলাদা section থাকলে সেটাও remove বা redirect করব, কারণ আপনি বলেছেন support ticketing এবং bandwidth একই flow হিসেবে রাখতে হবে।

3. **Manual bKash payment request admin-এর কাছে visible করব**
   - এখন reseller invoice-এর manual payment RPC `create_bw_invoice_manual_payment` pending row তৈরি করছে `bw_sale_collections` টেবিলে। কিন্তু admin-এর “BW Sale → Collection” এবং invoice detail page পড়ে `bw_sale_payments` থেকে। তাই request দেখা যাচ্ছে না।
   - RPC পরিবর্তন করব যাতে manual payment request সরাসরি `bw_sale_payments`-এ `approved=false` হিসেবে যায়।
   - sender number, TrxID, note, method এগুলো `receipt_no`, `paid_by`, `remarks/description`-এ সংরক্ষণ করব, যাতে admin বুঝতে পারে কে manual payment request দিয়েছে।
   - admin collection page-এ pending filter/list-এ এগুলো visible থাকবে এবং existing Approve/Delete buttons দিয়েই approve করা যাবে।

4. **পুরনো pending request হারিয়ে না যায় সেটা দেখব**
   - যদি আগের manual requests `bw_sale_collections.status='pending'` হিসেবে থেকে থাকে, সেগুলো admin-visible `bw_sale_payments` pending row-তে migrate/backfill করার ব্যবস্থা রাখব।
   - duplicate না হয় এমন guard ব্যবহার করব।

5. **শেষে verify করব**
   - reseller/BW portal থেকে ticket menu/card আর দেখা যাচ্ছে না।
   - manual bKash payment submit করলে admin BW Sale → Collection-এ Pending হিসেবে দেখা যায়।
   - approve করলে invoice payment history এবং due calculation ঠিক থাকে।