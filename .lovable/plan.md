# Resignation Management — পূর্ণাঙ্গ প্ল্যান

বর্তমানে `resign_rules` আর `resignations` দুটো table আছে কিন্তু minimal। UI পেইজ দুটোও আছে কিন্তু field গুলো reference screenshot এর মতো না। দুটো menu আলাদাই রাখব (HR & Payroll → Resign Rules আর Resignations)।

## 1. Database migration

**`resign_rules` table এ যোগ:**
- `description` (text) — rule এর details
- `is_active` (boolean, default true)
- `tenant_id` (uuid) — multi-tenant scope
- `updated_at` trigger

**`resignations` table এ যোগ:**
- `type` (text: `resign` | `terminate`, default `resign`)
- `letter_received_date` (date)
- `resignation_letter_url` (text) — Supabase Storage path
- `good_or_bad_activities` (text)
- `is_applied` (boolean, default false) — applied হলে employee left-list-এ যাবে
- `applied_rules` (jsonb) — `[{rule_id, checked}]` checklist
- `tenant_id` (uuid)
- `created_by` (uuid)
- `updated_at` trigger

**নতুন storage bucket:** `resignation-letters` (private, RLS: tenant এর user দেখতে/upload করতে পারবে)।

RLS: দুই table-এই `tenant_id = current_user_tenant()` policy।

## 2. Resign Rules page (`/dashboard/hr/resign-rules`)
- Table: Serial, Rule Name, Details, Active toggle, Edit/Delete
- "+ Resign Rules" button → Modal (Name, Details, Active)
- Default seed: "All Asset Returned", "All Salary Paid"

## 3. Resignations page (`/dashboard/hr/resignations`)
- Table: Employee Name, Type (Resign/Terminate badge), Resign Date, Letter Received Date, Reason, Activities, Action (Download Attachment, Edit, View History)
- Filter: Type, Date range, Search
- "+ New Resignation" button → Modal:
  - Resign/Terminate radio
  - Employee select (active employees)
  - Resignation Letter file upload (jpg/png/pdf/doc/docx)
  - Letter Received Date, Resign Date (End Date)
  - **Official Resign Rules:** dynamic checkbox list — `resign_rules` থেকে active গুলো load হবে
  - Reason for Resignation (textarea, required)
  - Good or Bad Activities (textarea)
  - "Is Resignation Applied" checkbox — checked হলে employee status update
  - Save

## 4. Business logic
- "Is Resignation Applied" = true হলে:
  - `employees.status = 'resigned'` (terminate হলে `'terminated'`)
  - `employees.resign_date = resign_date`
  - সব active shift assignment বন্ধ
- View Resignation History → ওই employee এর সব past resignation entry modal-এ
- Download Attachment → signed URL দিয়ে letter download

## 5. Files (technical)

**New/edit:**
- `supabase/migrations/<ts>_resignation_module.sql` — alter tables + bucket + RLS
- `src/pages/dashboard/hr/ResignRules.tsx` — পূর্ণ rewrite (table + modal)
- `src/pages/dashboard/hr/Resignations.tsx` — পূর্ণ rewrite (table + Add modal + history modal)
- `src/components/hr/ResignationForm.tsx` — reusable form
- `src/components/hr/ResignationHistoryDialog.tsx`
- `src/hooks/useResignRules.ts`, `src/hooks/useResignations.ts` — react-query CRUD

স্ক্রীনশটের সব field এবং rule-checklist behavior কভার হবে।
