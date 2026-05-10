## Plan

### 1) Client List column order ঠিক করা
- `ClientList.tsx` টেবিলে header order এখন: `Exp Date` → `R.Days` → `কানেকশন টাইপ`।
- body-তে order ভুল আছে: `Exp Date` → `connection_type` → `R.Days`।
- body cell order header-এর সাথে মিলিয়ে দেবো: `Exp Date` → `RemainingDaysCell` → `connection_type`।
- Footer `colSpan` alignment-ও column count অনুযায়ী মিলিয়ে দেবো।

### 2) Bulk recharge zero টাকা দেখানো fix
- Database function `pop_recharge_client_days` / `pop_bulk_recharge_clients` বর্তমানে `pop_daily_charges`-এ conflict হলে row insert হয় না, কিন্তু wallet deduct calculation stale/ভুল হতে পারে; user-এর case-এ selected clients-এর জন্য no ledger/no expire update হয়েছে।
- Function update করবো যাতে:
  - charge amount আগে থেকে নির্ভরযোগ্যভাবে calculate হয় (`selling_rate / validity_days * days`, fallback `monthly_bill / 30`),
  - existing charge-date conflict থাকলেও manual recharge fail silently না করে correct debit/expiry update করে,
  - response-এ `charged`, `new_expire_date`, `succeeded`, `failed`, `total_charged` reliable আসে।

### 3) Manual recharge করলে expiry + MikroTik status sync
- Recharge হলে client `expire_date` আজ থেকে/বর্তমান active expiry থেকে selected days যোগ করে update হবে।
- Recharge success হলে DB-তে `mikrotik_status = enabled` হবে।
- `portal-data` edge function-এ successful recharge-এর পরে যাদের `mikrotik_id` + `username` আছে তাদের জন্য `manage-mikrotik-ppp` action `enable` invoke করবো, যাতে RouterOS secret-ও enabled হয়।
- তবে শুধু recharge success হলে enable হবে; expired অবস্থায় আলাদা manual MikroTik ON করলে সেটি allow না করার guard পরে যোগ করা যাবে যদি আপনার চান। এই fix-এ recharge workflow-এর enableটাই করা হবে।

### 4) UI refresh ও message ঠিক করা
- `BulkClientRechargeDialog` success message backend response থেকে actual total amount দেখাবে।
- Recharge success হলে `clients-list`, `pop-balance-info`, `pop-billing-clients` invalidate হবে যাতে R.Days/Expire/Balance সঙ্গে সঙ্গে update হয়।

### 5) Validate
- MVP-000001 এবং 0002-000011-এর current package/tariff/balance data দিয়ে calculation verify করবো।
- Migration apply হলে read query দিয়ে function definition/affected records যাচাই করবো।
- Edge function deploy/test করে popup action আর column order confirm করবো।