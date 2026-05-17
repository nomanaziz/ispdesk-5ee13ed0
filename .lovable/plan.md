# কর্মী Edit-এ Shift Assignment

কর্মী সম্পাদনা (HR & Payroll → AddEmployee) ফর্মে একটি **শিফট (Shift)** সিলেক্টর যোগ করব, যা Shift Management থেকে আসা শিফটগুলো দেখাবে। সেই কর্মীর জন্য নির্বাচিত শিফট তাদের উপস্থিতি (Attendance) রেকর্ডে default হিসেবে assign হবে।

## পরিবর্তন

### 1. Database (migration)
- `employees` টেবিলে নতুন কলাম: `default_shift_id uuid` (nullable, `shifts.id`-এর FK)

### 2. `src/pages/dashboard/hr/AddEmployee.tsx`
- `defaultForm`-এ `default_shift_id: ""` যোগ
- `shifts` লোড করার জন্য `useQuery` — `supabase.from("shifts").select("id,name,start_time,end_time").eq("status","active").order("name")`
- Edit লোডের সময় ও save-allowed fields-এ `default_shift_id` যুক্ত
- Department/Position/Payroll Template-এর পাশে একটি নতুন `<Select>` — **"শিফট"** label, প্রতিটি option-এ `name (start–end)` দেখাবে
- কর্মীর জন্য default শিফট সেট করা হলে Shift Management থেকে আলাদা assign করার দরকার নেই (Attendance fallback হিসেবে ব্যবহার হবে)

### 3. `src/pages/dashboard/hr/Attendance.tsx`
- Employees query-তে `default_shift_id` সহ select করব
- `upsertMutation` ও `bulkMarkPresent`-এ নতুন attendance row insert করার সময় employee-এর `default_shift_id` থাকলে সেটি `shift_id` হিসেবে সেট হবে
- টেবিলে নতুন কলাম **"শিফট"** যোগ — employee-এর default shift নাম দেখাবে (read-only badge)

### যা অপরিবর্তিত
- `ShiftManagement.tsx` — তারিখভিত্তিক per-day shift override (`employee_shift_assignments`) আগের মতই কাজ করবে; default শিফট না থাকলে বা override থাকলে সেটি priority পাবে
- বাকি AddEmployee ফিল্ড, validation, user access section সব আগের মতো

## প্রভাবিত ফাইল
- migration (new): `employees.default_shift_id` কলাম যোগ
- `src/pages/dashboard/hr/AddEmployee.tsx`
- `src/pages/dashboard/hr/Attendance.tsx`

Approve করলে migration আগে চালাব, তারপর কোড আপডেট করব।
