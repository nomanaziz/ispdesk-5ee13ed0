## সমস্যা যেটা পাওয়া গেছে

- Sidebar-এ **বিলিং তালিকা** আছে **All Clients** গ্রুপের ভিতরে, কিন্তু permission map-এ এটা আলাদা **BILLING > Billing List** হিসেবে আছে। তাই All Clients permission দিলেও billing option/action consistent হচ্ছে না।
- **হোম ক্লায়েন্ট / কর্পোরেট ক্লায়েন্ট / বিলিং তালিকা** একই visible menu hierarchy-এর অধীনে থাকলেও permission table-এ আলাদা আলাদা পুরনো group/name দিয়ে মিশ্রভাবে রাখা হয়েছে।
- Bill paid / bill receive করতে গেলে frontend button দেখা গেলেও database RLS এখনো মূলত admin-only billing write ধরে রেখেছে, তাই employee permission পেলেও payment save করতে পারে না।
- Employee role-এর উদ্দেশ্য self-service/contact-level access; full HR payroll admin menu employee role থেকে খুলে যাওয়া উচিত না।

## ঠিক করার পরিকল্পনা

### 1. Menu-কে single source of truth করা
- `menuItemModuleMap.ts`-এ All Clients গ্রুপের সব item একই group-এ আনব:
  - `CLIENTS > New Request`
  - `CLIENTS > Home Clients`
  - `CLIENTS > Corporate Clients`
  - `CLIENTS > Billing List`
  - `CLIENTS > Daily Collection`
  - `CLIENTS > Installation Fee`
  - `CLIENTS > Left Clients`
  - `CLIENTS > Scheduler`
  - `CLIENTS > Change Request`
  - `CLIENTS > Portal Manage`
  - `CLIENTS > Update Requests`
- `/dashboard/billing/cycle-settings` যেহেতু System menu-তে আছে, এটাকে `SYSTEM > Billing Cycle Settings` করব।
- Inventory category permission issue যেন না থাকে, `/dashboard/inventory/categories` অবশ্যই `INVENTORY > Categories` হিসেবেই থাকবে এবং role table-এ seed নিশ্চিত করব।

### 2. Role permission table menu অনুযায়ী sync করা
- Database migration দিয়ে সব role-এর জন্য visible sidebar menu items অনুযায়ী missing permission rows add করব।
- পুরনো `BILLING > Billing List / Daily Collection / Installation Fee` permission থাকলে তার enabled + permission level নতুন `CLIENTS > Billing List / Daily Collection / Installation Fee` row-তে copy করব, যাতে existing roles ভাঙে না।
- এরপর sidebar ও role permission screen একই item list দেখাবে; All Clients-এর ভিতরের item আর আলাদা Billing group হিসেবে কাজ করবে না।

### 3. Bill paid / receive permission ঠিক করা
- Billing List page-এ:
  - `CLIENTS > Billing List` write/full থাকলে row-level “পরিশোধ” button দেখাবে।
  - read-only হলে শুধু bill status/due দেখা যাবে, paid করার button থাকবে না।
- Daily Collection page-এ:
  - `CLIENTS > Daily Collection` write/full থাকলে “রিসিভ বিল” action থাকবে।
  - read-only হলে collection list দেখা যাবে, receive action থাকবে না।

### 4. Database RLS update করা
- `billing` table:
  - read: `CLIENTS > Billing List` অথবা `CLIENTS > Daily Collection` read permission থাকলে দেখা যাবে।
  - write: bill receive/generate করার জন্য একই item-এর write permission লাগবে।
- `bill_collections` table:
  - read/write permission একইভাবে All Clients-এর Billing List/Daily Collection permission থেকে চলবে।
- `income_entries` insert:
  - bill receive করলে income entry create হয়, তাই billing write permission থাকলে insert allow করব।

### 5. Page/route protection align করা
- Sidebar hidden থাকলেও direct URL দিলে page খুলে যাওয়া কমাতে route/page-level guard যোগ করব।
- Guard `ITEM_MODULE` map থেকে permission check করবে, যাতে menu ও page access একই logic follow করে।

### 6. Employee role cleanup
- Protected Employee role-এ admin HR/Payroll module rows disabled থাকবে।
- শুধু `আমার প্যানেল` self-service items employee-এর জন্য থাকবে।
- Employee contact number দেখানোর প্রয়োজন থাকলে সেটা `HR_PAYROLL > Employees` read permission দেওয়া custom/extra role দিয়ে করা যাবে, পুরো HR payroll খুলবে না।

## Verification

- Employee/custom role-এ `CLIENTS > Billing List = write` দিলে:
  - All Clients-এর ভিতরে Billing List দেখা যাবে।
  - billing list page খুলবে।
  - unpaid/partial bill-এ “পরিশোধ” button দেখা যাবে।
  - payment submit করলে RLS error ছাড়াই billing, bill_collections, income_entries update হবে।
- শুধু read দিলে page দেখা যাবে, কিন্তু paid/receive action থাকবে না।
- `INVENTORY > Categories` read দিলে Inventory group-এর Category menu দেখা যাবে।
- Employee role শুধুমাত্র আমার প্যানেল দেখাবে, full HR payroll admin menu নয়।