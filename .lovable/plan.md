
# HR Attendance — Convert, Report ও Geo-Attendance

আপনার ৪টা request — প্রত্যেকটার জন্য আলাদা solution নিচে।

---

## ১) Device User → Employee Convert (one-click)

**বর্তমানে:** `ZktecoDevices.tsx` → Device Users tab-এ unmapped user-এর পাশে শুধু "Map to existing employee" combobox আছে।

**যা যোগ হবে:**
- প্রত্যেক unmapped device user-এর পাশে নতুন button: **"➕ Employee বানাও"**
- Click করলে `AddEmployee` page-এ navigate করবে, query string-এ:
  - `?from_device_user={row_id}&device_user_id={code}&device_id={device_id}&name={device_name}&card={card_no}`
- `AddEmployee.tsx`-এ এই query param detect করে:
  - Name, card number auto-fill হবে
  - উপরে একটা amber banner: "ZKTeco device user #15 (Nahid) থেকে তৈরি হচ্ছে — save করলে automatic map হবে"
- Save successful হলে একই transaction-এ:
  1. `employees` row insert (with `device_user_id`, `zkteco_device_id` set)
  2. `zkteco_device_users.mapped_employee_id` = নতুন employee.id update
- তারপর redirect → `EmployeeView` page

---

## ২) Daily In/Out Report (HR view + Employee self-view)

**Data source:** `zkteco_attendance_logs` (employee-এর সব raw punch — already populated, device-এ ২০+ user-এর ৭০+ punch আছে)।

**Rule:** প্রতিদিনের **প্রথম punch = IN**, **শেষ punch = OUT**.
- যদি দিনে শুধু ১টা punch থাকে → "OUT missing" (amber badge)
- যদি ০টা punch থাকে (working day) → "Absent" (red)
- দুটাই থাকলে → Total hours calc (OUT − IN)

**নতুন page: `/dashboard/hr/attendance-report`** (HR/Admin জন্য)
- Filter: Employee dropdown (সব mapped employee), Month picker, Branch
- Table: Date | Day | IN time | OUT time | Total hours | Status
- Footer: Total present days, total hours, late count
- Export: PDF / Excel button

**Employee Self-View (Portal):**
- Employee portal-এ নতুন menu: **"আমার Attendance"**
- Default current month, top-এ summary cards: Present / Absent / Late / Total hours
- নিচে daily table (same format)
- Login: existing portal auth (employee → `employees.portal_user_id` link থাকতে হবে — `employees` table-এ এখন নাই, এটা migration করব)

**EmployeeView page-এও যোগ:** একটা "Attendance" tab — HR যে কোনো employee-র monthly in/out দেখতে পারবে।

---

## ৩) আপনার ৩ employee (al amin / joy / nahid) এর জন্য

Device-এ এখন নাম দেখাচ্ছে: Shafiul, Sumon, Iqbal, **Nahid**, Jakir, Noman, Masum, Omor, Ananda, Ashik, Rubel, Nazmul, Turjo, Sohan, Rana ইত্যাদি (২০+ user)।

"al amin" আর "joy" নামে device-এ user দেখাচ্ছে না — সম্ভবত নামগুলো ভিন্ন (যেমন Noman/Jakir হয়তো alias)।

**আমার plan:**
- Convert feature ready হলে আপনি device user list দেখে যেকোনো user-কে এক click-এ employee বানাতে পারবেন
- যে ৩ জনের কথা বলেছেন তাদের device user_id (1-23 এর মধ্যে কোনটা) আমাকে জানান — অথবা feature deploy-এর পর আপনি UI থেকে নিজেই করতে পারবেন
- Map হয়ে গেলে তাদের monthly in/out report automatic দেখাবে (already ৭০+ punch জমা আছে)

---

## ৪) Geolocation-based Mobile Attendance (Possible? — হ্যাঁ)

**হ্যাঁ, এটা possible এবং standard approach আছে।**

**Concept:**
- Admin → HR Settings-এ office location define করবে: latitude, longitude, allowed radius (যেমন ১০০ মিটার)
- Multiple location support (Branch-wise office)

**Employee Mobile Flow:**
- Portal-এ নতুন page: **"Punch In/Out"**
- বড় button: "📍 এখন Check In"
- Click করলে browser-এর `navigator.geolocation.getCurrentPosition()` চালু হবে
- Coordinates নিয়ে Haversine distance calc → office radius-এর ভেতরে কি না check
- ভেতরে হলে → punch save (`attendance` table-এ `source='mobile_geo'`, lat/lng সহ)
- বাইরে হলে → "❌ আপনি office থেকে ৩৫০ মিটার দূরে — punch হবে না"

**Anti-cheat measures:**
- `accuracy` field check (GPS accuracy ৫০m-এর কম হতে হবে)
- Same-day duplicate punch within X minutes block
- Optional selfie capture (camera API) — admin চাইলে enable
- IP log + device fingerprint store

**Database additions (migration):**
- `attendance_rules` / `branches`-এ: `office_lat`, `office_lng`, `geo_radius_meters`, `geo_attendance_enabled`
- `attendance`-এ: `punch_lat`, `punch_lng`, `punch_accuracy_m`, ইতিমধ্যে `source` আছে

**Limitations** (clearly বলে দিচ্ছি):
- iPhone Safari-তে geolocation কাজ করে শুধু HTTPS-এ (আমাদের আছে ✅)
- VPN / fake GPS app দিয়ে cheat করা সম্ভব — ১০০% bulletproof নয়, কিন্তু ZKTeco device + geo combo দিলে strong
- Battery saver mode-এ GPS slow

---

## Implementation Order (আজকেই শেষ হবে)

1. **Step 1:** Convert button + AddEmployee auto-fill + auto-map (১ ঘণ্টা)
2. **Step 2:** HR Attendance Report page (daily/monthly, IN/OUT/missing logic) (১.৫ ঘণ্টা)
3. **Step 3:** EmployeeView-এ Attendance tab (৩০ মিনিট)
4. **Step 4:** Database migration — branch lat/lng/radius + attendance geo columns (১৫ মিনিট)
5. **Step 5:** Geo-punch page + Haversine check + save (১ ঘণ্টা)
6. **Step 6:** HR Settings-এ Office location setup UI (৩০ মিনিট)

---

## একটা প্রশ্ন (clarify করলে ভালো হয়)

**Employee self-attendance view-এর জন্য login কোনটা use করব?**
- (A) আলাদা **Employee Portal** বানাব (employees table-এ email/password add করে নতুন login system)
- (B) existing **Customer Portal**-এই employee login দিব (যদি customer == employee হয়)
- (C) Admin Dashboard-এর ভেতরেই থাকবে — HR/Admin দেখবে, employee self-view পরে করব

আমার **suggest: A** — আলাদা ছোট employee portal (`/employee` route), simple login, শুধু attendance + payslip + leave দেখতে পারবে। Mobile-first design।

Plan approve করলে শুরু করছি।
