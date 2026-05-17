## পরিবর্তন

### ১. All Clients পেজ — মাসিক বিল কলামের নিচে total

`src/pages/dashboard/clients/ClientList.tsx` এর `TableFooter` (লাইন ৬৮১–৬৮৭) বর্তমানে hardcoded `colSpan={8}` ব্যবহার করছে, যার কারণে total amount ভুল কলামে (Exp Date এর নিচে) দেখাচ্ছে। কলাম visibility dynamic হওয়ায় static colSpan ব্যবহার করা যাবে না।

ঠিক করব:
- মাসিক বিল কলামের *আগে* দৃশ্যমান কলামগুলোর সংখ্যা গণনা করে dynamic `colSpan` সেট করব (checkbox + ক্লা.কোড + কাস্টমার নাম + visibility-dependent: username, password, contact, zone, package)।
- মাসিক বিল cell-এ total `৳ X,XXX` রাখব।
- মাসিক বিলের *পরে* দৃশ্যমান কলামগুলোর সংখ্যা গণনা করে অবশিষ্ট colSpan সেট করব।

ফলাফল: total ৳6,500 ঠিক মাসিক বিল কলামের নিচে আসবে।

### ২. Billing List — footer-এ total calculation

`src/pages/dashboard/billing/BillingList.tsx`-এ এখন কোনো `TableFooter` নেই। `TableBody` (লাইন ৬৮৬) বন্ধ হওয়ার পরে একটি `TableFooter` যোগ করব যা দেখাবে:
- **মোট মাসিক বিল** = `filtered.reduce((s, c) => s + Number(c.monthly_bill || 0), 0)`
- **মোট পরিশোধিত** = `filtered.reduce((s, c) => s + Number(c.totalPaid || 0), 0)`
- **মোট বকেয়া** = `filtered.reduce((s, c) => s + Number(c.totalDue || 0), 0)`

কলাম alignment-ও dynamic colSpan দিয়ে করব যাতে সংখ্যাগুলো ঠিক "মাসিক বিল", "পরিশোধিত", "বকেয়া" কলামের নিচে আসে। বাকি কলামগুলো খালি colSpan cell দিয়ে পূরণ করব।

### Files
- `src/pages/dashboard/clients/ClientList.tsx` — footer colSpan dynamic
- `src/pages/dashboard/billing/BillingList.tsx` — নতুন TableFooter যোগ
