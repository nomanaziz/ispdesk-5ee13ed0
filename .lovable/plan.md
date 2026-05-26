
# পুরা HR Automation Plan

আপনার অনেক tables আগে থেকেই বানানো আছে (`employees`, `shifts`, `employee_shift_assignments`, `attendance`, `attendance_rules`, `leave_*`, `payroll_*`, `zkteco_*`)। আমি এগুলোর উপরেই automation logic বসাবো। কাজটা বড় তাই **৬টা Phase**-এ ভাগ করছি। প্রতিটা phase শেষে test করতে পারবেন।

---

## Phase 1 — ZKTeco User Sync (Two-way)

Device-এর user list-কে `employees` table-এর সাথে sync করা।

- **Pull from Device** → ZKTeco-তে যেসব user-code আছে (uid + name + card no) সব fetch করে `zkteco_device_users` নামে নতুন staging table-এ রাখা হবে।
- UI-তে list দেখানো হবে: "এই device user-টা কোন employee?" — dropdown থেকে map করলে `employees.device_user_id` + `zkteco_device_id` save হবে।
- **Push to Device** → কোনো employee-কে select করে "Push to Device" button — edge function `zkteco-user-push` device-এ user create/update করবে (CMD_USER_WRQ ব্যবহার করে)। Fingerprint/card তারপর machine-এ গিয়ে enroll করবেন।
- **Delete from Device** → employee resign/remove করলে device থেকেও মুছবে।
- **Bulk** sync button — সব unmapped device user একসাথে দেখা।

ZK protocol-এ user push-এর জন্য zkteco.ts-এ `CMD_USER_WRQ`, `CMD_SET_USER` helper যোগ করতে হবে।

---

## Phase 2 — Shift System Upgrade

বর্তমান `shifts` + `employee_shift_assignments` per-date model আছে। এতে যোগ করব:

- **Shift template type**: `regular` (default daily), `rotating` (morning/evening/night cycle), `custom`
- **Shift fields**: `start_time`, `end_time`, `grace_minutes` (late grace), `half_day_after`, `absent_after`, `early_leave_minutes`, `min_hours` (যেমন 9 ঘণ্টা)
- **Monthly Roster Generator** — একটা page যেখানে HR মাসের শুরুতে employee × dates grid-এ shift assign করবে (bulk fill, copy-from-previous-month, rotation pattern)
- **Shift Swap** — দু'জন employee নিজেদের মধ্যে নির্দিষ্ট তারিখে shift exchange request করবে → HR approve করলে `employee_shift_assignments` swap হবে। নতুন table `shift_swap_requests`।
- **Default fallback**: যদি কোনো দিন assignment না থাকে তাহলে `employees.default_in_time/out_time` ব্যবহার হবে।

---

## Phase 3 — Auto Attendance Processing

ZKTeco logs raw থাকে — সেগুলোকে দৈনিক attendance-এ রূপান্তর।

- নতুন edge function `process-attendance` — daily cron (রাত ২টায় pg_cron) সব employee-এর আগের দিনের `zkteco_attendance_logs` দেখে:
  - **First punch = check_in, last punch = check_out** (single-shift rule)
  - সেই দিনের assigned shift এর সাথে মিলিয়ে status নির্ধারণ:
    - `present` — on time
    - `late` — শুরুর time + grace-এর পরে এসেছে
    - `half_day` — half_day_after পেরিয়েছে
    - `absent` — কোনো punch নেই বা absent_after-এর পরে এসেছে
    - `early_leave` — শেষের আগেই বের হয়েছে
  - Total worked hours হিসাব → min_hours-এর কম হলে flag
  - `attendance` table-এ একটা row insert/update (employee_id + date unique)
- Holiday/Weekly off check — `events_holidays` দেখে holiday হলে absent count হবে না।
- Approved leave থাকলে status = `leave`।
- Manual "Re-process" button HR-এর জন্য।

---

## Phase 4 — Leave Management Connection

আগে থেকেই tables আছে, এখন flow পূর্ণ করব:

- Employee leave apply → manager/HR approve/reject
- Approved leave automatic `attendance.status='leave'` করবে এবং `leave_balances` থেকে কাটবে
- Leave category-ভিত্তিক balance (casual/sick/annual) — মাসিক/বার্ষিক accrual
- Calendar view — কে কোন দিন leave-এ আছে

---

## Phase 5 — Payroll Automation (Deductions)

মাস শেষে salary auto-calculate:

- `payroll_periods`-এর জন্য একটা "Generate Payroll" button
- প্রতিটা employee-এর জন্য সেই মাসের attendance scan:
  - **Late deduction** — `attendance_rules.late_deduction` (flat টাকা বা % per occurrence)
  - **Absent deduction** — full day salary বা configured %
  - **Half-day** — half salary
  - **Early leave** — configurable
  - **Short hours** — assigned hours-এর কম কাজ করলে pro-rata
- Result `payroll_details`-এ — এ HR row-by-row edit/approve করতে পারবে ("কাটতে চাইলে কাটব, না চাইলে না কাটব")
- Final approve হলে payslip generate

---

## Phase 6 — Employee Self-Service Portal

`/employee` route — employee নিজের login-এ দেখবে:

- আজকের shift, এই মাসের roster calendar
- নিজের attendance history (present/late/absent count)
- Leave balance + apply form + history
- Shift swap request — অন্য colleague select করে exchange propose
- Payslip download
- Profile (read-only mostly)

`employees.has_user_access` + `user_username/password` field আগে থেকেই আছে — সেটা ব্যবহার করব (অথবা auth.users-এর সাথে link)।

---

## Technical Section

**New tables:**
- `zkteco_device_users` (staging from device pull)
- `shift_swap_requests` (employee_a, employee_b, date_a, date_b, status)
- `attendance` rows-এ যোগ: `worked_hours numeric`, `late_minutes int`, `early_minutes int`

**New edge functions:**
- `zkteco-user-pull` (device → DB)
- `zkteco-user-push` (DB → device, ZK CMD_USER_WRQ)
- `process-attendance` (daily cron — raw logs → attendance rows)
- `generate-payroll` (monthly — attendance → deductions)

**Cron schedule (pg_cron):**
- প্রতিদিন রাত ২টা — `process-attendance` সব device-এর জন্য
- প্রতি ১৫ মিনিট — `sync-zkteco-data` (existing)

**UI pages to add/upgrade:**
- `ZktecoDevices.tsx` → Device Users tab (Phase 1)
- `ShiftManagement.tsx` → Roster Grid + Swap (Phase 2)
- `Attendance.tsx` → status pills, reprocess button (Phase 3)
- `Payroll.tsx` → Generate + edit deductions (Phase 5)
- নতুন `/employee/*` routes (Phase 6)

---

## আমার Confirmation দরকার

1. **Phase order ঠিক আছে?** Phase 1 (ZKTeco user sync) দিয়ে শুরু করি, না Phase 3 (auto attendance) আগে চান?
2. **Single-shift first-punch/last-punch logic** ঠিক আছে, না multi-punch (each pair = in/out) চান?
3. **Employee portal login** — `auth.users` ব্যবহার করব (recommend), না `employees.user_username/password` field-এ rely করব?

উত্তর দিলে Phase 1 থেকে build শুরু করব।
