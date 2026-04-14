

## Plan: Enhanced Employee Form + Auto-ID Settings

### Phase 1: Database Migration

**Add columns to `employees` table:**
- `date_of_birth` (date)
- `gender` (text) — Male/Female/Other
- `personal_phone` (text) — ব্যক্তিগত নম্বর
- `office_phone` (text) — অফিস নম্বর
- `guardian_phone` (text) — অভিভাবকের নম্বর
- `marital_status` (text)
- `nid_number` (text) — NID/জন্ম সনদ
- `facebook_link` (text)
- `reference` (text)
- `district` (text)
- `upazila` (text)
- `permanent_address` (text)
- `working_experience` (text)
- `last_degree` (text)
- `institution` (text)
- `passing_year` (text)
- `punch_card_id` (text) — ZKTeco punch card
- `default_in_time` (time)
- `default_out_time` (time)
- `zkteco_device_id` (uuid FK → zkteco_devices)
- `image_url` (text) — profile photo
- `payroll_template_id` (uuid FK → payroll_templates)

**New table: `hr_settings`** — for employee ID auto-generation config:
- `id` (uuid PK), `setting_key` (text UNIQUE), `setting_value` (jsonb), `created_at`
- Stores: `{ "mode": "auto"|"manual", "prefix": "EMP", "next_number": 1, "padding": 3 }`
- Auto mode generates: `EMP001`, `EMP002`, etc.

### Phase 2: Rebuild AddEmployee.tsx

Redesign with 5 card sections matching the reference:

**1. Basic Information (ব্যক্তিগত তথ্য)**
- Name*, DOB, Gender (select), Personal Phone*, Office Phone*, Guardian Phone
- Marital Status (select), NID Number, Email, Facebook Link, Reference
- District (select from config), Upazila (select from config)
- Working Experience (textarea), Present Address (textarea), Permanent Address (textarea)

**2. Attendance Information (উপস্থিতি তথ্য)**
- Device (select from zkteco_devices), Punch Card ID, Default In Time, Default Out Time

**3. Educational Qualification (শিক্ষাগত যোগ্যতা)**
- Last Achieved Degree, Institution/Board, Passing Year

**4. Posting Information (চাকুরি সম্পর্কিত)**
- Joining Date*, Department (select), Position/Designation (select)
- Payroll Template (select), Salary, Show on Website toggle, Profile Image upload

**5. Employee ID** — auto-generated based on hr_settings or manual input

### Phase 3: HR Settings Page

New page at `/dashboard/hr/settings` or integrate into System Settings:
- Employee ID Mode: Auto / Manual (radio)
- If Auto: Prefix (text, e.g. "EMP"), Start Number, Padding (digits)
- Preview: shows example like "EMP001"

### Routing & Sidebar
- Add HR Settings link under HR & Payroll section

### Technical Details
- Profile image upload uses Supabase Storage bucket
- Auto-ID: on form load (new employee), fetch hr_settings → generate next ID → display as read-only
- Districts/Upazilas already exist in config tables — reuse them in selects

