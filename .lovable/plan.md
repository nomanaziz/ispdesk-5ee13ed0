

## লক্ষ্য
POP Profile page-এর ৬টা tab-কে সঠিক business logic অনুযায়ী সাজানো + Credit Refund (prepaid only) automation যোগ করা।

## ১. Exported vs Unexported Clients — সঠিক সংজ্ঞা

**Exported Client** = MikroTik-এ আছে **এবং** POP তার client portal-এ import/add করেছে (`clients` table-এ row আছে, `branch_id = POP`)

**Unexported Client** = MikroTik-এ আছে **কিন্তু** POP এখনো তার client list-এ add করে নাই (MikroTik PPP secret আছে, কিন্তু `clients` table-এ matching row নাই) — তবু enabled থাকলে টাকা কাটছে

**Left Client recovery flow**: ভুল POP-এ transfer হলে → admin "Unexported Clients" থেকে **Recover** button চাপলে → user-টা MikroTik-এ অপরিবর্তিত থাকে, শুধু portal mapping reset হয় → পরে সঠিক POP-এ transfer করা যাবে

### পরিবর্তন
- ✏️ `PopProfile.tsx` → **Exported Clients** tab: query এমনভাবে — MikroTik PPP secrets ∩ `clients` table (এই POP-এর)
- ✏️ **Unexported Clients** tab: MikroTik PPP secrets − `clients` table; প্রতিটা row-এ **Recover** button (existing "Clients Bulk Revert"-কে clarify করে rename: "Recover to Source POP")
- Recover action → একটা edge function বা direct update যা MikroTik user-কে untouched রেখে portal-side mapping clear করে; admin তখন অন্য POP-এ assign করতে পারবে

## ২. Credited Transactions — দৈনিক কাটা টাকার hisab

বর্তমান view মোটামুটি ঠিক আছে (image-145), শুধু কয়েকটা refinement:
- Default range = **চলতি মাসের ১ম তারিখ → আজ** (already mostly so)
- Month navigator: "← Previous Month / Next Month →" buttons যোগ
- View (eye) button → **Credited History dialog** (image-146 এর মতো ইতিমধ্যে আছে — ঠিক আছে)
- POP portal-এও same view দেখা যাবে (already exists in PortalLedger — verify করব)

## ৩. Credit Refund Policy — Prepaid-only Auto Refund

**Trigger**: Prepaid POP-এর কোনো client delete / "left" mark করা হলে → unused days × daily rate ফেরত যাবে POP-এর fund-এ।

### সূত্র
```
unused_days = max(0, recharge_to_date - today)
refund_amount = unused_days × package_daily_rate
```

### Database (migration প্রয়োজন)
- ➕ `credit_refund_logs` table: `id, client_id, pop_id, package_id, daily_rate, paid_days, used_days, refund_days, refund_amount, refunded_at, status`
- ➕ Trigger function `process_credit_refund_on_client_left()` — `clients` table-এ DELETE বা `status='left'` হলে fire করবে; check করবে: 
  1. POP `pop_type='prepaid'` কিনা
  2. POP `credit_refund_policy = true` কিনা
  3. Client-এর latest recharge active কিনা
  - সব সত্য হলে: refund row insert + POP-এর `branch_managers.balance` += refund_amount + log entry

**Postpaid POP-এ কোনো refund হবে না** (per-day kataChhe, advance নেয় নাই)

## ৪. POP Change Logs (image-148)
ইতিমধ্যে কাজ করছে — শুধু verify করব যে credit refund policy toggle change-ও log হচ্ছে। না হলে trigger যোগ করব।

## ৫. Files Changed

**Database migration**:
- ➕ `credit_refund_logs` table + RLS
- ➕ `process_credit_refund_on_client_left()` trigger function + trigger on `clients` table

**Code**:
- ✏️ `src/pages/dashboard/branches/PopProfile.tsx` — Exported/Unexported query logic ঠিক করা, Recover button যোগ
- ➕ `src/pages/dashboard/branches/PopCreditRefundLogs.tsx` — নতুন subtab বা existing tab-এ section যোগ refund history দেখাতে
- ✏️ `src/pages/portal/PortalLedger.tsx` — POP portal-এ same credited history view ensure করা

## কী **হবে না**
- MikroTik-এ existing user touch হবে না recover-এর সময়
- Postpaid POP-এ refund logic কাজ করবে না (intentional)
- পুরাতন data migration হবে না

