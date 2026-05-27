# Employee Default Role Lock + External/Remote App User

## কী বদলাবে

### 1. Employee role এখন fixed
- App User dialog-এ যখন কোনো **Employee** select করা হবে, primary role automatically `Employee` হয়ে যাবে এবং dropdown **disabled/locked** থাকবে (পরিবর্তনযোগ্য না)।
- পাশে badge: "🔒 Employee — fixed for all staff"
- শুধু **অতিরিক্ত role** (Billing, HR, Accounts, Technician ইত্যাদি) checkbox দিয়ে যোগ করা যাবে।
- DB trigger update — employee-linked app_user-এর `role_id` সবসময় Employee force করবে (UI bypass হলেও protect)।

### 2. Employee role permissions পরিপূর্ণ করা
Employee role-এ এই module-গুলো ইতিমধ্যেই আছে — Salary/Payslip, Attendance, Leave, Conveyance, Lunch Order, Facilities, Profile। যোগ হবে:
- **My Requisition** — product/equipment requisition (screwdriver, tools ইত্যাদি) আবেদন
- **My Accommodation** — নিজের accommodation view (ইতিমধ্যে My Facilities-এ আছে, আলাদা করা হবে স্পষ্টতার জন্য)
- **My Salary Sheet** — শুধু নিজেরটা, অন্যদের না (RLS দিয়ে enforce)

### 3. External / Remote Support User (নতুন)
`app_users`-এ নতুন কলাম যোগ:
- `user_type` enum: `internal` (default), `external`, `remote_support`
- `access_expires_at timestamptz NULL` — null = permanent, value থাকলে সেই সময়ের পর login বন্ধ
- `purpose text` — কেন access দেওয়া হলো (vendor demo, troubleshooting ইত্যাদি)
- `created_by_note text`

**Login enforcement**: Auth context check করবে `access_expires_at < now()` হলে session terminate।

**External user-এ Employee role auto-attach হবে না** (trigger condition: শুধু `user_type='internal'` হলে)। External user যে role দেয়া হবে শুধু সেটাই কাজ করবে।

### 4. AppUsers পেজ UI বদল
- উপরে tab: **Internal | External | Remote Support | All**
- "নতুন App User" বাটনে dropdown:
  - **Employee থেকে বানান** → existing ConvertToAppUserDialog (Employee role locked)
  - **External User যোগ করুন** → নতুন dialog: name, email, username, password, primary role, expiry date, purpose
  - **Remote Support Access দিন** → একই form কিন্তু default expiry = 24 ঘণ্টা, role = "Remote Support" (নতুন protected role)
- Table-এ extra column: Type badge (Internal/External/Remote), Expiry countdown ("৩ দিন বাকি", "Expired")।

### 5. নতুন protected role: `Remote Support`
- Read-only access — শুধু device monitoring, ticket view
- কোনো customer/billing data নয়

## টেকনিক্যাল

### Migration
```sql
-- 1. New type + columns
CREATE TYPE app_user_type AS ENUM ('internal','external','remote_support');
ALTER TABLE app_users
  ADD COLUMN user_type app_user_type NOT NULL DEFAULT 'internal',
  ADD COLUMN access_expires_at timestamptz,
  ADD COLUMN purpose text;

-- 2. New protected role "Remote Support" with read-only modules
INSERT INTO app_roles(name, is_protected, status) VALUES ('Remote Support', true, 'Active');
-- Plus app_role_modules: Devices view, Network monitoring view, Tickets view

-- 3. Employee role gets My Requisition module
INSERT INTO app_role_modules (role_id, module_group, module_name, enabled, permission) ...

-- 4. Update auto-attach trigger: only when user_type='internal' AND employee_id IS NOT NULL
-- 5. New trigger: force role_id='Employee' when user_type='internal' AND employee_id NOT NULL
-- 6. Expiry enforcement: function/policy that checks access_expires_at on login
```

### Files
- `src/pages/dashboard/access/AppUsers.tsx` — tabs, type column, expiry display, type-aware dialog
- `src/components/hr/ConvertToAppUserDialog.tsx` — role select disabled when employee
- `src/components/access/ExternalUserDialog.tsx` (নতুন) — external/remote-support flow
- `src/contexts/AuthContext.tsx` — expiry check on session load
- (অপশনাল) নতুন page `src/pages/dashboard/hr/MyRequisition.tsx` — placeholder

## Scope বহির্ভূত
- Requisition-এর পুরো workflow (approval, tracking) — পরে আলাদা plan
- Remote support session recording/audit — পরে

## প্রশ্ন
1. Remote support default expiry **24 ঘণ্টা** ঠিক আছে, না-কি অন্য default (যেমন ৪ ঘণ্টা)?
2. External user-এর জন্য কি **email-based login** চান (Supabase auth), না-কি existing username/password pattern? (এখন username/password ধরে এগোচ্ছি)
3. Expired user-কে কি **auto-delete** হবে, না-কি শুধু **disabled** থেকে যাবে history-র জন্য? (Disabled রাখার পরিকল্পনা — manual cleanup)