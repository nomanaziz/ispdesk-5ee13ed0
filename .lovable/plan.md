## সমস্যা

বর্তমানে Bulk Recharge ডায়ালগে সব selected client-এর daily rate-এর গড় (average) দেখানো হচ্ছে। কিন্তু ক্লায়েন্টদের package আলাদা হলে এই গড় বিভ্রান্তিকর — যেমন স্ক্রিনশটে ৩ জন Basic/5Mb + ১ জন Standard/10Mb থাকা সত্ত্বেও একটাই "Avg ৯.৫৮" দেখাচ্ছে।

## সমাধান

ডায়ালগে average বাদ দিয়ে **package-wise breakdown** দেখানো হবে। প্রতিটি package-এর জন্য আলাদা সারিতে থাকবে: package নাম, কতজন client সেই package-এ আছে, per-day rate, এবং সেই package-এর line total. সব মিলিয়ে নিচে গ্র্যান্ড total ও POP balance দেখানো হবে — যেটা আগের মতই days × (sum of all clients' daily rate)।

## পরিবর্তন

### 1. Edge function — `get_clients_recharge_cost` (`supabase/functions/portal-data/index.ts`)
Response item-এ আরো দুটি field যোগ করা হবে যাতে frontend group করতে পারে:
- `package_id`
- `package_name` (e.g. "বেসিক/5Mb")

`pop_resolve_client_package_cost` RPC-এর return-এ এগুলো না থাকলে `clients → isp_packages` থেকে আলাদা lookup করে যোগ করা হবে।

### 2. Frontend — `src/components/reseller/BulkClientRechargeDialog.tsx`
- `costMap`-এ `package_id` ও `package_name` রাখা হবে।
- নতুন `groups` memo: `package_id` দিয়ে clients group করে প্রতিটি group-এর `{ packageName, clientCount, dailyRate, lineTotal = dailyRate × clientCount × days }` বের করা হবে।
- UI পরিবর্তন:
  - "Avg. Per Day Charge" ফিল্ড সরিয়ে ফেলা হবে।
  - একটা ছোট টেবিল/লিস্ট যোগ করা হবে যা প্রতিটি package-এর জন্য একটি row দেখাবে:
    ```text
    Package         Clients   ৳/day    Days×Clients×Rate
    বেসিক/5Mb        3         5.00     15.00
    স্ট্যান্ডার্ড/10Mb  1         10.00    10.00
    ```
  - নিচে আগের মতই: **Selected Clients**, **POP Balance**, **Total Creditable Amount** (= সব group-এর line total-এর যোগফল)।
- Min-days, balance-exceed warning, mutate লজিক — আগের মতই অপরিবর্তিত থাকবে।

## আনচেঞ্জড

- ব্যাকএন্ড recharge লজিক (`pop_bulk_recharge_clients`, `pop_recharge_client_days`)।
- চার্জ হিসাবের সূত্র: প্রতিটি ক্লায়েন্টের নিজস্ব daily rate × days। মোট টাকা আগের মতই থাকবে — শুধু displayটা package-wise হবে।
