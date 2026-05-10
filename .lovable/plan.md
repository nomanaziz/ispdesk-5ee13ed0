## Plan: তিনটা POP/client logic একসাথে ঠিক করা

### 1) User transfer-এ fund logic ফিরিয়ে আনা
- `charge_pop_for_client_activation` database function update করব।
- POP/Reseller-এর `fund_started = false` হলে কোনো balance check বা deduction হবে না।
- `fund_started = true` হলে আগের মতো insufficient balance check হবে এবং balance deduct হবে।
- এতে client code `0003`-এর মতো যেসব POP fund start করা হয়নি, তাদের transfer/activation-এ আর `INSUFFICIENT_BALANCE` দেখাবে না।

### 2) Manager list-এর “Running” column ঠিক করা
- `src/pages/dashboard/branches/Managers.tsx`-এ column label `Running` বদলে `All Client` করব।
- count logic হবে:
  - **All Client** = ঐ reseller/POP branch-এর মোট client
  - **Enabled Client** = `mikrotik_status = enabled`
  - **Disabled Client** = `mikrotik_status = disabled`
  - **Left** = `status = left/inactive` বা billing left
- current `billing_status` দিয়ে enabled/disabled গণনার ভুল logic বাদ দেব, যাতে screenshot-এর summary সঠিক হয়।

### 3) Auto recharge enabled client expire না হওয়া ও daily charge ঠিক করা
- `apply-pop-daily-charges` edge function ঠিক করব:
  - `auto_recharge_enabled = true` client expired হলেও সরাসরি disable করবে না।
  - প্রথমে `pop_auto_renew_client`/recharge logic চালাবে, balance থাকলে daily/package charge কেটে expire date বাড়াবে এবং MikroTik enabled রাখবে।
  - recharge সফল হলে database ও MikroTik status enabled করা হবে।
  - শুধু recharge fail/insufficient balance হলে disabled হবে।
- `reseller-auto-recharge` edge function-ও একই safety রাখবে: auto recharge fail হলেই disable, success হলে enabled.
- POP client list refresh query invalidate থাকবে যাতে `/pop-admin/clients`-এ immediately updated status দেখা যায়।

### Technical changes
- Database migration: `charge_pop_for_client_activation` function update, `fund_started` gate restore.
- Edge functions: `apply-pop-daily-charges`, `reseller-auto-recharge`, and if needed `portal-data` recharge response handling.
- Frontend: `Managers.tsx` count query/select and table labels.

### Validation
- Database function definition verify করব।
- Relevant edge function deploy/test করব।
- Confirm করব: fund not started POP transfer no longer checks balance, manager counts use MikroTik status, and auto-recharge users are renewed/enabled instead of auto-expired.