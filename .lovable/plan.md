## লক্ষ্য
Reseller billing-কে সম্পূর্ণ prepaid wallet model-এ ঠিক করা হবে: debt/negative balance/remaining debt নয়; reseller wallet balance থাকলেই client active/recharge/auto recharge চলবে, balance না থাকলে paid action বন্ধ হবে এবং client suspend/disabled হবে।

## কী পরিবর্তন হবে

1. **Wallet balance হবে main controller**
   - `branch_managers.balance`-কে reseller wallet balance হিসেবে ব্যবহার করা হবে।
   - reseller/client activation/recharge/bulk recharge/auto recharge করার আগে balance validate হবে।
   - `allow_negative_balance` logic আর reseller prepaid flow-তে ব্যবহার হবে না; balance কম হলে `INSUFFICIENT_BALANCE` error হবে।

2. **Package buying price ও duration ব্যবহার করা হবে**
   - reseller package-এর admin selling rate / tariff selling rate হবে reseller-এর buying price।
   - `validity_days` না থাকলে fallback 30 দিন।
   - `monthly_bill`/reseller’s own selling price দিয়ে admin balance কাটবে না; balance কাটবে reseller buying price বা proportional daily cost দিয়ে।

3. **Client create/activation prepaid হবে**
   - reseller নতুন client তৈরি করলে selected package price wallet থেকে কাটা হবে।
   - balance যথেষ্ট হলে client create হবে, `expire_date = today + package duration` হবে, client active/enabled থাকবে।
   - balance কম হলে client create/activate হবে না, error: “Insufficient Balance — আগে wallet recharge করুন।”
   - direct Supabase insert দিয়ে যেসব reseller create flow আছে সেগুলো portal edge action/RPC দিয়ে secure করা হবে।

4. **R.Days countdown ঠিক থাকবে**
   - reseller `/pop-admin/clients` এবং `/pop-admin/billing/list` দুই জায়গাতেই R.Days/Remaining Days দেখা যাবে।
   - R.Days হবে `expire_date - today`; এটা debt নয়, শুধু validity countdown।
   - R.Days cell থেকে manual recharge করলে selected days অনুযায়ী proportional prepaid cost কাটবে এবং expiry extend হবে।

5. **Auto Recharge ON/OFF + bulk toggle**
   - per-client `auto_recharge_enabled` থাকবে।
   - individual toggle-এর পাশে clear badge/icon থাকবে।
   - selected clients-এর জন্য bulk “Auto Recharge ON” এবং “Auto Recharge OFF” action যোগ হবে।
   - global reseller auto recharge setting ON থাকলেও শুধুমাত্র client-level auto recharge ON client renewal হবে।

6. **Auto renewal flow ঠিক হবে**
   - client expired হলে এবং auto recharge ON থাকলে:
     - wallet balance >= package price হলে full package duration renew হবে।
     - balance কম হলে client suspend/disabled হবে, renewal হবে না।
   - auto recharge OFF হলে client normally expire হবে; reseller manual recharge করবে।

7. **Daily prepaid deduction cron ঠিক হবে**
   - `apply-pop-daily-charges` cron prepaid logic ব্যবহার করবে।
   - daily cost = package buying price / validity_days।
   - প্রতিদিন active non-disabled clients-এর জন্য wallet থেকে daily cost কাটা হবে।
   - balance insufficient হলে affected clients disabled/suspended হবে; negative balance হবে না।
   - already charged same day duplicate কাটবে না।

8. **UI cleanup: debt language remove**
   - reseller UI-তে “Remaining Debt”/due-based wording থাকলে সরিয়ে Wallet Balance, Available Balance, R.Days, Daily Cost, Package Cost দেখানো হবে।
   - billing list-এর due/monthly bill columns reseller portalে confusing হলে label/summary prepaid wording-এ adjust করা হবে।

## Technical changes

- **Database/RPC migration**
  - Update `pop_recharge_client_days` to calculate cost from reseller buying price + validity duration, never negative balance.
  - Update `pop_bulk_recharge_clients` to stop charging once wallet is insufficient and report success/fail per client.
  - Add/replace secure RPC for `pop_activate_client_prepaid` / `pop_create_client_prepaid` if needed so direct inserts cannot bypass wallet deduction.
  - Add helper to resolve client package charge: tariff package buying rate + validity days.

- **Edge functions**
  - `portal-data`:
    - `create_client` validates package ownership and balance, deducts wallet, sets expiry.
    - `pop_recharge_client` and bulk recharge use prepaid RPC.
    - `set_client_auto_recharge` supports both single and bulk.
    - list APIs include balance, auto recharge, remaining prepaid details.
  - `reseller-auto-recharge`:
    - renews full package duration only for expired + auto recharge ON clients.
    - disables/suspends clients when balance is insufficient.
  - `apply-pop-daily-charges`:
    - uses prepaid wallet deduction and disables clients when wallet can’t cover daily cost.

- **Frontend**
  - `BillingList.tsx` and `ClientList.tsx`: show R.Days + auto recharge icon/toggle in reseller mode.
  - `BulkActionButtons.tsx`: add bulk auto recharge enable/disable buttons for reseller mode.
  - `RemainingDaysCell.tsx`: show prepaid cost preview and use prepaid recharge call.
  - `BulkClientRechargeDialog.tsx`: calculate selected clients’ prepaid package/day cost correctly and show available balance.
  - `AddClient.tsx`, `ResellerMikrotikUsers.tsx`, `ResellerMikrotikBulkCreate.tsx`, `PopBulkClientImport.tsx`: route reseller client creation through wallet-validating portal action instead of direct inserts.
  - Reseller dashboard/settings copy updated to explain prepaid wallet rules.

## Expected result
Reseller portal will work like a prepaid wallet system: wallet balance controls client creation, manual recharge, bulk recharge, auto recharge, and daily deduction; no debt/loan/negative balance logic will be used.