## Plan: Billing List-এ paid/received amount ঠিক করা

### সমস্যা
- Daily Collection-এ এই মাসে ৫টা approved collection আছে, মোট ৳2500।
- এর মধ্যে ৪টা collection-এর `billing_id` নেই, তাই Billing List current month bill row খুঁজে পাচ্ছে না।
- ফলে যাদের টাকা receive হয়েছে তাদের Billing List-এ `পরিশোধিত = 0`, `বকেয়া = 0`/ভুল status দেখাচ্ছে।

### Fix
1. **Billing List data calculation ঠিক করা**
   - Billing List current month-এর জন্য শুধু `billing` table-এর `paid/due` নয়, একই মাসের `bill_collections` থেকেও client-wise collection যোগ করবে।
   - current month collection থাকলে `পরিশোধিত` কলামে সেই amount দেখাবে।
   - due calculation হবে: `monthly_bill - current_month_collected - discount`, minimum `0`।
   - due `0` হলে bill status হবে `পরিশোধিত/Paid`; সেখানে `বকেয়া` badge/button থাকবে না।

2. **No bill row but payment received case handle করা**
   - যদি current month billing row না থাকে কিন্তু bill collection থাকে, তাহলে UI-তে virtual current bill বানিয়ে দেখাবে:
     - `paid = collected_this_month`
     - `due = 0` যদি monthly bill fully covered হয়
     - `status = paid`
   - এতে screenshot-এর `abc/e/kabir/moron` type clients paid দেখাবে।

3. **Daily Collection receive flow future-proof করা**
   - Daily Collection থেকে bill receive করলে current month bill না থাকলে আগে bill row তৈরি করবে, তারপর payment apply করবে।
   - এতে ভবিষ্যতে `bill_collections.billing_id` null থাকবে না এবং Billing List/Daily Collection দুই page একই data দেখাবে।

4. **POP/admin path consistent রাখা**
   - admin billing list direct Supabase query দিয়ে collection যোগ করবে।
   - POP mode-এ প্রয়োজন হলে `portal-data` response-এ same month collection include করা হবে, যাতে reseller portal-এও একই logic চলে।

5. **Verification**
   - database read দিয়ে confirm করব যে current month collection amount Billing List-এর paid amount হিসেবে গণনা হচ্ছে।
   - Billing List UI-তে paid clients-এর জন্য `পরিশোধিত` badge থাকবে এবং `বকেয়া/পরিশোধ` button থাকবে না।