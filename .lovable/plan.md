

## লক্ষ্য
PopPackages page-এ নিশ্চিত করা যে **শুধু SellingRate** column editable, বাকি ৮টি column (BuyingRate সহ) সম্পূর্ণ read-only — কোনোভাবেই edit করা যাবে না।

## বর্তমান অবস্থা (audit)
Code পড়ে দেখলাম:
- ✅ Backend (`update_tariff_selling_rate`) শুধু `selling_rate` field update করে, `buy_rate` immutable
- ✅ Backend validation: `selling_rate >= buy_rate` enforce করা আছে
- ✅ Frontend Action column-এর pencil শুধু `selling_rate` cell-কে input-এ পরিণত করে
- ⚠️ কিন্তু visual clarity কম — কোন cell editable সেটা user-এর কাছে স্পষ্ট নয়। SellingRate cell আর BuyingRate cell দেখতে একই রকম, তাই confusion হচ্ছে।

## পরিবর্তন (single file: `src/pages/reseller/config/PopPackages.tsx`)

### 1. Visual distinction — BuyingRate "locked" দেখানো
- BuyingRate cell-এ ছোট 🔒 lock icon + muted color → "এটা admin set করেছে, edit করা যাবে না"
- Tooltip: "Admin-এর নির্ধারিত rate — পরিবর্তনযোগ্য নয়"

### 2. SellingRate cell highlight
- Background subtle green tint (`bg-emerald-50/40`) যাতে editable column চোখে পড়ে
- Header-এ ছোট ✏️ icon + tooltip: "শুধু এই column পরিবর্তনযোগ্য"

### 3. Helper banner (table-এর উপরে, ছোট one-liner)
```
ℹ️ BuyingRate = Admin আপনার কাছে যে দামে বিক্রি করেছে (পরিবর্তনযোগ্য নয়)। 
   শুধু SellingRate edit করে আপনার নিজের client-দের জন্য দাম নির্ধারণ করুন।
```

### 4. Edit input UX improvement
- Input-এর placeholder/label: "Buy: ৳400 → Min sell: ৳400"
- যদি draft rate < buy_rate হয় real-time red border + inline warning "Buy rate এর কম হতে পারবে না"

### 5. Action column tooltip আরও স্পষ্ট
- Pencil button hover: "Selling Rate edit করুন"

## যা **বদলাবে না**
- Backend `portal-data` edge function — intact (already correct)
- Buy rate immutability — already enforced server-side
- Table structure, columns, pagination, search — সব intact
- Edit flow logic (`updateRate` mutation) — intact

## Files
- **Modified**: `src/pages/reseller/config/PopPackages.tsx`

approve করলে এই ১টি file-এ visual clarity improvements apply করব।

