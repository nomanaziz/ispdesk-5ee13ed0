# HRM & Payroll System Settings

Screenshot অনুযায়ী একটি কেন্দ্রীয় system settings page তৈরি করব যেখানে attendance ও payslip generation এর সব কনফিগারেশন এক জায়গায় থাকবে এবং পুরো system জুড়ে কাজ করবে।

## কোথায় যোগ হবে
- বিদ্যমান `HrSettings.tsx` page-টি পুনর্গঠন করে এতে নতুন section যোগ করা হবে (Employee ID config-ও থাকবে)
- Sidebar এ "HR সেটিংস" আগের মতই `/dashboard/hr/settings`

## Page Structure (Tabs/Sections)

### 1. Employee ID (বিদ্যমান — অপরিবর্তিত)

### 2. Attendance Settings
- **Edit after Overtime approval** — Enable/Disable (overtime approve হবার পরে In/Out edit allow করা হবে কিনা)
- **Edit Previous Month Timing** — Current Month only / Current + Previous Month
- **Weekend Days** — ৭ দিনের checkbox (default: Friday)
- **Late & Overtime Manage** (৩টা minute input):
  - Start time এর কত মিনিট পরে এলে Late count শুরু হবে
  - End time এর কত মিনিট আগে গেলে Early Out count শুরু হবে
  - End time এর কত মিনিট পরে থাকলে Overtime count শুরু হবে

### 3. Payslip Generation Settings
- **Generate with Late fee** — Enable/Disable
- **Generate with Early Out fee** — Enable/Disable
- **Generate with Overtime fee** — Enable/Disable

নিচে একটি **Save or Update** বাটন সব section save করবে।

## Data Storage
বিদ্যমান `hr_settings` (key/value JSON) table-ই ব্যবহার করব — নতুন migration লাগবে না।
- `setting_key = 'attendance_settings'` → `{ edit_after_ot_approval, edit_previous_month, weekend_days: [..], late_after_min, early_out_before_min, overtime_after_min }`
- `setting_key = 'payslip_settings'` → `{ apply_late_fee, apply_early_out_fee, apply_overtime_fee }`

## Integration (পুরো app জুড়ে effect)
1. **Attendance edit guard** — `Attendance.tsx` এ in/out edit করার আগে `edit_after_ot_approval` ও `edit_previous_month` check করা হবে; previous month হলে block।
2. **Late / Early-out / Overtime calculation** — `Attendance.tsx` এবং attendance ingestion এ minute thresholds অনুযায়ী status set হবে।
3. **Weekend** — Attendance ও Payroll এ weekend day list থেকে holiday detect হবে (সবাই present count এ বাদ যাবে)।
4. **Payslip generation** — `payrollCompute.ts` এ payslip generate করার সময়:
   - `apply_late_fee` ON হলে late count × পূর্বনির্ধারিত rate কর্তন
   - `apply_early_out_fee` ON হলে early-out fee কর্তন
   - `apply_overtime_fee` ON হলে overtime hours × rate যোগ
   OFF থাকলে এই lines skip হবে।

## নতুন/পরিবর্তিত ফাইল
- `src/pages/dashboard/hr/HrSettings.tsx` — সম্পূর্ণ পুনর্গঠন (৩ section)
- `src/hooks/useHrPayrollSettings.ts` — নতুন hook (attendance + payslip settings cached fetch)
- `src/lib/payrollCompute.ts` — late/early-out/overtime conditional apply
- `src/pages/dashboard/hr/Attendance.tsx` — edit guard + threshold-based status
- কোনো DB migration **লাগবে না** (existing `hr_settings` JSON-এ store হবে)
