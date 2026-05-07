## Dashboard-এ Top Due Clients সেকশন যোগ

হোম পেজে (`/dashboard`) নতুন একটি **"টপ বকেয়া (Top Due)"** সেকশন যোগ হবে — যেখানে প্রতিটি ক্যাটাগরির শীর্ষ ২০ জন বকেয়াদার (নাম + পরিমাণ) এক জায়গায় দেখা যাবে, এবং উপরে summary KPI।

### নতুন তথ্য

**Summary KPI (৪টি ছোট কার্ড):**
- হোম ক্লায়েন্ট মোট বকেয়া (৳)
- কর্পোরেট ক্লায়েন্ট মোট বকেয়া (৳)
- ব্যান্ডউইথ কাস্টমার মোট বকেয়া (৳)
- POP নেগেটিভ ব্যালেন্স মোট (৳)

**Top 20 List Cards (৪টি ট্যাব/কলাম):**
1. **🏠 হোম ক্লায়েন্ট — Top 20 বকেয়া**  
   `billing` থেকে `due > 0` rows নিয়ে `client_id` ধরে aggregate, `clients` থেকে নাম + `client_type='home'` filter। দেখাবে: নাম, ফোন, মোট বকেয়া, কতগুলো বিল pending।

2. **🏢 কর্পোরেট ক্লায়েন্ট — Top 20 বকেয়া**  
   একই, কিন্তু `client_type='corporate'`।

3. **🌐 ব্যান্ডউইথ কাস্টমার — Top 20 বকেয়া**  
   `bw_sales_invoices` থেকে `due > 0` rows aggregate করে `customer_id` ধরে, `bw_sale_customers` থেকে নাম। দেখাবে: কাস্টমার নাম, কনট্যাক্ট, মোট বকেয়া।

4. **📡 POP — Top 20 নেগেটিভ ব্যালেন্স**  
   `branch_managers` থেকে `balance < 0` rows, ascending order (সবচেয়ে negative প্রথমে)। দেখাবে: POP name, কত টাকা পাওয়া যাবে (`abs(balance)`).

### UI Layout

```text
─── টপ বকেয়া (Top Due) ───────────────────────
[ হোম: ৳X ] [ কর্প: ৳X ] [ ব্যান্ড: ৳X ] [ POP: ৳X ]

Mobile:  ১ কলাম stack
Desktop: ২×২ grid — ৪টি কার্ড পাশাপাশি
Each card: scrollable list (max-h ~280px), rank #, নাম, বকেয়া
প্রতিটি item ক্লিকে → সংশ্লিষ্ট client/customer/POP profile-এ যাবে
```

### Files to change

1. **`src/pages/Dashboard.tsx`**
   - `useStats()` hook-এ ৪টি নতুন query যোগ:
     - `clients` join `billing` → group by client_id, sum due, filter by client_type
     - `bw_sales_invoices` → group by customer_id, sum due
     - `branch_managers` → balance < 0 order by balance asc limit 20
   - নতুন রেন্ডার সেকশন: KPI strip + 4 list cards
   - নতুন helper component: `TopDueListCard({ title, items, href, tone })`

### Technical Notes

- Queries client-side aggregate করব (Supabase JS-এ `select('client_id, due')` → JS-এ `reduce`), কারণ এতে নতুন migration লাগবে না।
- প্রতিটা list 20 rows-এ সীমাবদ্ধ; total pending bills count item-এ tooltip-এ দেখাব।
- ফরম্যাট: `৳1,23,456` (existing `fmt()` helper reuse)।
- Loading skeleton, "কোনো বকেয়া নেই" empty state।
- মোবাইলে compact: ফন্ট ছোট, padding কম, full-width single column।