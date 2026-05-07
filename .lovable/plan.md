# Automatic Process — পূর্ণ implementation

## ১. Cutoff time predefine সরানো (System Setup)

**File:** `src/pages/dashboard/system/Setup.tsx`

`কাটঅফ সময়` field বর্তমানে dropdown — শুধু ৪টা option (12 AM, 7 AM, 8 AM, 12 PM)। এটাকে free-form `<Input type="time">` করা হবে, যেন যেকোনো সময় (07:15, 08:42, যা ইচ্ছা) সেট করা যায়। একইভাবে "এনফোর্সমেন্ট দিন" select থাকবে (Same/Next Day) — সেটা আসলে input না, choice।

## ২. Automatic Process page সম্পূর্ণ rebuild

**File:** `src/pages/dashboard/system/AutomaticProcess.tsx`

বর্তমানে DB তে মাত্র ৬টা process আছে, কোনো scope নেই। Screenshot এ ২৫টা process + ৫টা tab আছে।

### Tabs (scope) যোগ
- System
- Admin Customer
- POP
- POP Customer
- Bandwidth POP

`automatic_processes` টেবিলে নতুন column `scope text` যোগ করা হবে (default `'system'`)।

### Table columns (screenshot অনুযায়ী)
Branch | Process Name | Execute At | Interval | Execution Day | Action

### Edit dialog
- **Execute At** — `<Input type="time">` (free-form, কোনো predefine না)
- **Interval** — Minutely / Hourly / Daily / Weekly / Monthly / Default
- **Execution Day** — Today / Tomorrow / Specific date
- **Enabled** toggle

### Action icons (screenshot এর মতো)
- Edit (pencil) — schedule edit dialog
- Info (i) — last/next run popover
- View (eye) — last execution log
- Run Now (diamond) — manually trigger this process

## ৩. ২৫টা Process seed করা

Migration দিয়ে `automatic_processes` টেবিলে নিচের সব process insert করা হবে (যেগুলো নাই)। Branch null = global, পরে branch-wise override।

| # | Scope | Process Name | Key | Time | Interval |
|---|---|---|---|---|---|
| 1 | system | Fund Credit & Disable of Postpaid POPs | fund_credit_postpaid_pops | 00:05 | daily |
| 2 | system | Sync All Customer By Servers | sync_customers_servers | — | hourly |
| 3 | system | Generate Monthly Bill of Customers | gen_monthly_bill_customers | 06:00 | daily |
| 4 | system | Disable Unpaid Customers | disable_unpaid_customers | 12:00 | daily |
| 5 | system | Send SMS To Unpaid Customers Before Expiry | sms_unpaid_before_expiry | 08:30 | daily |
| 6 | system | Package Scheduler of Customers | pkg_scheduler_customers | 23:40 | daily |
| 7 | system | Status Scheduler of Customers | status_scheduler_customers | 23:30 | daily |
| 8 | system | Validate Payments of Customers | validate_payments | — | hourly |
| 9 | system | Failed Fund Credit of MAC Reseller Clients | failed_fund_credit_mac | 00:15 | daily |
| 10 | system | Fund Credit of Failed MAC Resellers | fund_credit_failed_mac | 06:30 | daily |
| 11 | system | Check Negative Balance of MAC Resellers | check_neg_bal_mac | 07:00 | daily |
| 12 | system | Delete Extra MAC Reseller Mikrotik Users | del_extra_mac_mt_users | 05:30 | daily |
| 13 | system | Disable MAC Reseller Users For Low Balance | disable_mac_low_bal | — | hourly |
| 14 | system | Generate Monthly Bill of MAC Resellers | gen_monthly_bill_mac | 06:15 | daily |
| 15 | system | Send SMS To Unpaid MAC Client Before Expiry | sms_mac_unpaid_expiry | 08:45 | daily |
| 16 | system | Generate Recurring Bandwidth Sale Invoice | gen_recurring_bw_invoice | 03:00 | daily |
| 17 | system | Process for Attendance Logs | proc_attendance_logs | — | hourly |
| 18 | system | Execute Manual Processes | exec_manual_processes | — | minutely |
| 19 | system | Data Seed In Flex Value Table | data_seed_flex | 06:30 | daily |
| 20 | system | Sync Expire Date With CRM | sync_expire_crm | 01:40 | daily |
| 21 | system | Prepaid POP Clients Automatic Renewal & Disable | prepaid_pop_renewal | 07:00 | daily |
| 22 | system | Prepaid MAC Reseller Clients Validity Checker | prepaid_mac_validity | 00:30 | daily |
| 23 | system | Sync All MAC Reseller Clients By Servers | sync_mac_clients | — | hourly |
| 24 | system | Disabled Unpaid Customers Status Change To InActive | disabled_unpaid_to_inactive | 23:20 | daily |
| 25 | system | CRM Eligibility Checker | crm_eligibility_check | 04:15 | daily |

বাকি ৪টা tab (Admin Customer / POP / POP Customer / Bandwidth POP) — এখন শুধু খালি tab দেখাবে "এই scope এর process পরে যোগ হবে" message সহ। আপনি data দিলে সেগুলোও seed করব।

## ৪. ⚠️ যা এই step এ করব না (পরের step)

- pg_cron + edge function দিয়ে actual execution wiring (২৫টা প্রতিটার আলাদা logic — এটা অনেক বড়, আলাদা message এ ধরব)
- প্রতিটা process এর "Run Now" এর backend logic
- Execution log table

এই step এ শুধু **UI + data seeding + scope tab + free-form time** complete হবে, যাতে আপনি সব process configure করে রাখতে পারেন।

## Technical details

- Migration: `ALTER TABLE automatic_processes ADD COLUMN scope text NOT NULL DEFAULT 'system'`
- Migration: `INSERT ... ON CONFLICT (process_key) DO NOTHING` দিয়ে ২৫টা seed
- `process_key` কে UNIQUE করতে হবে (যদি না থাকে)
- AutomaticProcess.tsx এ shadcn `Tabs` দিয়ে scope filter
- Edit dialog এ Execute At = `<Input type="time">`, Interval এ `default` option যোগ (যখন time = NULL/Default)

Approve করলে শুরু করে দিচ্ছি।