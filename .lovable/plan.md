

## লক্ষ্য
POP admin (Settings) এর সব sub-page reference image অনুযায়ী **create + functional** করা, এবং Setting থেকে **User Management সরিয়ে দেওয়া**।

## Reference image analysis (Galaxy Net portal এর সাথে mapping)

| Galaxy Net page | আমাদের status | কাজ |
|---|---|---|
| Settings → Common System Settings | ✅ আছে (`Setup.tsx`) | Functional রাখব |
| Settings → Clients & Billing Settings | ❌ নেই | নতুন tab/section বানাব (image-1 অনুযায়ী 11টা switch group) |
| Bill Period (image-192) | ⚠️ আছে কিন্তু আলাদা logic | Year-toggle list যোগ করব নতুন `BillPeriodYears.tsx` |
| Company Settings | ✅ আছে (`Company.tsx`) | অপরিবর্তিত |
| EMail SetUp (image-193) | ✅ আছে (`Email.tsx`) | Mail/SMTP protocol toggle যোগ করব |
| Invoice SetUp (image-194) | ✅ আছে (`Invoice.tsx`) | Logo upload + position toggle যোগ করব |
| Payment Gateways | ✅ আছে | অপরিবর্তিত |
| P. Processing Fee | ✅ আছে | অপরিবর্তিত |
| Activity Loggers | ✅ আছে (`SystemLog.tsx`) | অপরিবর্তিত |
| **Automatic Process** (image-190) | ❌ নেই | নতুন page বানাব |
| **User Management** | ❌ remove করতে হবে | sidebar + route + file delete |

## কী কী হবে

### ১) User Management সরানো
- **AppSidebar.tsx**: "অ্যাপ ইউজার" + "রোল" + "OLT পারমিশন" + "Device Permissions" এই ৪টা item "সিস্টেম" group থেকে remove
- **App.tsx**: `/dashboard/system/users`, `/users/:id`, `/roles`, `/olt-permissions`, `/device-permissions` route remove + import remove
- **Files delete**: `src/pages/dashboard/system/Users.tsx`, `UserReview.tsx`, `Roles.tsx`, `OltPermissions.tsx`, `DevicePermissions.tsx`

> Permission system (RBAC) underlying functions/tables অপরিবর্তিত থাকবে — শুধু Settings menu থেকে UI সরানো হচ্ছে।

### ২) নতুন: **Bill Period (Year toggle)** — `BillPeriodYears.tsx`
Image-192 অনুযায়ী একটা table — Year column + Show On List (Switch toggle column)। Default 2025/2026/2027।
- Storage: `system_settings` key = `bill_period_years` → `{ "2025": false, "2026": true, "2027": false }`
- Toggle on/off, save instant
- Route: `/dashboard/system/bill-period-years`
- বাকি বছর filter দেখাতে চাইলে এখান থেকেই enable/disable হবে

> বর্তমান `Periods.tsx` (billing mode/cycle config) আলাদা থাকবে — এটা functional setting; নতুনটা শুধু year visibility।

### ৩) নতুন: **Automatic Process** — `AutomaticProcess.tsx`
Image-190 অনুযায়ী scheduler list page।
- Table columns: Branch, Process Name, Execute At, Interval, Execution Day, Action (info / view / status icon)
- Default 6 rows seed: Package Scheduler, Status Scheduler, Validate Payments, Disable Unpaid, Send SMS Before Expiry, Prepaid Auto Renewal
- Storage: নতুন table `automatic_processes` (id, branch_id, process_name, execute_at, interval_type, execution_day, enabled, last_run, next_run)
- Edit dialog → time + interval পরিবর্তন
- Action icons: Info popover, View last run logs, Toggle on/off
- Route: `/dashboard/system/automatic-process`

### ৪) **Settings** page এ Clients & Billing tab যোগ
`Setup.tsx`-এ একটা TabsList — "Common System Settings" | "Clients & Billing Settings"। নতুন tab-এ image-1 এর ১১টা group বসবে (প্রতিটা card-এ Yes/No বা select + Save button + side-info panel):
1. Payment Status Wise Client Enable/Disabled
2. Allow InActive Process at last day of month
3. Client Code Automatic / Customizable
4. Due SMS — Billing Date / Remaining Days
5. Send SMS To Unpaid Client — Before Days (1/2/3/5)
6. Client Billing Expire Date Extensions Permission (Whom + Days)
7. POP Client Automatic Scheduler Approval
8. Client Billing Status Scheduler Time Customization (5 status × 2 time)
9. POP Client Recharge Approval on PG Transactions
10. POP Client Expiry Date Update Policy on Payment Date
- প্রতিটা সেটিং `system_settings` table-এ key অনুযায়ী save (`useSystemSetting` hook reuse)
- Right-side info panel (description text) প্রতিটা group-এর সাথে

### ৫) Email & Invoice page small enhancements
- **Email.tsx**: উপরে Mail/SMTP radio protocol toggle যোগ (image-193)
- **Invoice.tsx**: Logo upload (Supabase storage `pop-logos` bucket reuse) + "Invoice" word position Left/Right radio + Invoice Title visibility Yes/No (image-194)

### ৬) Sidebar update
সিস্টেম group এর নতুন order:
```
- সিস্টেম সেটআপ (Setup — Common + Clients tabs)
- বিল পিরিয়ড (BillPeriodYears — new)
- পিরিয়ড সেটআপ (existing Periods)
- কোম্পানি সেটআপ
- ইনভয়েস সেটআপ
- ইমেইল সেটআপ
- পেমেন্ট গেটওয়ে
- প্রসেসিং ফি
- অটোমেটিক প্রসেস (new)
- সিস্টেম লগ (Activity Loggers)
- বিলিং সাইকেল সেটিংস (existing link)
```
User/Role/Permission menu items সরে যাবে।

## Database changes
1. নতুন table: `automatic_processes`
   ```
   id uuid PK, branch_id uuid null, process_name text, execute_at time,
   interval_type text ('daily'|'hourly'|'weekly'|'monthly'),
   execution_day text, enabled bool default true,
   last_run timestamptz, next_run timestamptz,
   created_at, updated_at
   ```
   - RLS: admin/super_admin full access; POP admin SELECT own branch
   - Seed 6 default rows
2. কোনো schema migration `system_settings` এর জন্য লাগবে না — JSON value-তে সব বসবে

## কোন file বদলাবে / তৈরি হবে
- `src/pages/dashboard/system/Setup.tsx` *(rebuild with tabs)*
- `src/pages/dashboard/system/BillPeriodYears.tsx` *(new)*
- `src/pages/dashboard/system/AutomaticProcess.tsx` *(new)*
- `src/pages/dashboard/system/Email.tsx` *(protocol toggle)*
- `src/pages/dashboard/system/Invoice.tsx` *(logo + position toggles)*
- `src/components/AppSidebar.tsx` *(menu update)*
- `src/App.tsx` *(routes add/remove)*

## Delete হবে
- `src/pages/dashboard/system/Users.tsx`
- `src/pages/dashboard/system/UserReview.tsx`
- `src/pages/dashboard/system/Roles.tsx`
- `src/pages/dashboard/system/OltPermissions.tsx`
- `src/pages/dashboard/system/DevicePermissions.tsx`

## কোন file বদলাবে না
- RLS policies on existing tables, edge functions, POP profile pages, billing logic

## Apply-এর পরে expected ফলাফল
1. Settings menu থেকে User/Role/Permission সরে যাবে
2. সব 10টা Settings page reference image অনুযায়ী functional হবে — toggle/save সরাসরি `system_settings`-এ persist
3. Bill Period year toggle list কাজ করবে
4. Automatic Process page থেকে scheduler config view/edit হবে
5. Email-এ Mail/SMTP, Invoice-এ logo upload + position toggle add হবে

