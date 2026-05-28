## লক্ষ্য
Employee/Support Engineer যেন শুধু দেওয়া permission অনুযায়ী menu, page, client data এবং actions দেখতে/করতে পারে। EMP001-এর মতো user যেন অতিরিক্ত HR/VAS/System access না পায়, আর Client List permission থাকলে client list empty না দেখায়।

## পাওয়া সমস্যা
- EMP001-এর primary role `Employee`, extra role `Support Engineer`। Effective permission extra role থেকেও আসছে।
- Support Engineer role-এ `Client List = write` আছে, কিন্তু `clients` RLS এখন শুধু Admin/Super Admin বা একই branch allow করছে। EMP001-এর branch নেই, তাই client list page খুললেও data empty।
- Sidebar এখন group-level permission চেক করছে। যেমন `SYSTEM > Setup` থাকলে পুরো System group দেখাচ্ছে, তাই Custom Domain/System Log/অন্য item দেখা যাচ্ছে।
- `HR ও পেরোল` group `Employees` permission পেলেই পুরো HR group খুলে যাচ্ছে। Item-level filtering নেই।
- permission hook শুধু `module_name` দিয়ে map বানাচ্ছে; `module_group + module_name` ধরে না। একই নাম/ কাছাকাছি নাম থাকলে permission leakage হতে পারে।
- Dashboard widget/bulk feature view শুধু primary role ধরে, extra role ধরে না; এটাও inconsistent।

## Implementation Plan

### 1) Permission engine ঠিক করা
- `useModulePermissions` আপডেট করব যাতে permission key হবে `module_group|module_name`।
- Backward compatibility রাখব: পুরনো `canRead('Client List')` call থাকলেও কাজ করবে, কিন্তু নতুন safe API হবে `canReadModule('CLIENTS', 'Client List')`।
- `enabled=false` permission কখনো effective access হিসেবে গণনা হবে না।

### 2) Sidebar item-level permission filtering
- `menuModuleMap.ts`-এ প্রতিটি sidebar item-এর exact permission mapping যোগ করব:
  - All Clients → Home/Corporate/Add/Scheduler/Portal Manage/Billing etc আলাদা আলাদা
  - HR & Payroll → Payroll/Payslip/Employees/Attendance/Leave/Settings আলাদা
  - System → Setup/Periods/Payment Gateways/System Log/Custom Domain/Company/Invoice আলাদা
  - VAS → Config/Subscriptions/Transactions আলাদা
  - Network/Bandwidth/Support/Reports/SMS/Inventory/Accounting ইত্যাদিও route অনুযায়ী map করব
- `AppSidebar`-এ group নয়, আগে item filter হবে; group তখনই দেখাবে যখন অন্তত ১টা allowed item থাকবে।
- Employee self-service “আমার প্যানেল” আগের মতো থাকবে, কিন্তু admin HR module permission না থাকলে HR & Payroll group দেখাবে না।

### 3) Route-level protection যোগ করা
- শুধু sidebar hide করলে হবে না—URL paste করেও যেন unauthorized page না খোলে।
- `App.tsx` routes-এ lightweight permission wrapper বসাবো, route অনুযায়ী `read/write/full` require করবে।
- unauthorized হলে clean “অনুমতি নেই” page দেখাবে বা employee panel-এ redirect করবে।

### 4) Client List visibility + action permission
- Database migration দিয়ে `clients` RLS policy আপডেট করব:
  - Admin/Super Admin full access থাকবে।
  - যাদের `CLIENTS > Client List` read/write/full আছে তারা client list দেখতে পারবে।
  - write/full permission অনুযায়ী create/update/delete policy আলাদা হবে।
- `ClientList`, `CorporateClients`, `ClientActionButtons`-এ action gates বসাবো:
  - read = শুধু view
  - write = add/edit/bill receive/scheduler/status/package/sync টাইপ কাজ
  - full = delete/bulk delete
- Add Client button, bulk actions, edit/delete dropdown permission অনুযায়ী hide/disable হবে।

### 5) Feature flags/bulk/dashboard permissions extra role-aware করা
- `app_user_effective_features` view migration দিয়ে primary + extra roles দুটোই ধরবে।
- `useFeatureFlags` default-on behavior শুধু unconfigured group-এর জন্য থাকবে; configured হলে disabled item hidden হবে।
- নতুন/মিসিং widgets/actions registry-তে যোগ করব যাতে Role page-এ সব permission দেখা যায়।

### 6) Role management UI polish
- Role page-এ module permissions আরো breakdown হবে:
  - group-level “সব চালু/সব বন্ধ” toggle
  - item-level permission select
  - enabled count
- Disabled item হলে permission dropdown inactive থাকবে, এবং save করার পর sidebar/page/action সঙ্গে সঙ্গে match করবে।

### 7) Verify EMP001 scenario
- EMP001 effective permissions re-check করব।
- Support Engineer হিসেবে:
  - Client List data দেখাবে যদি `CLIENTS > Client List` read/write থাকে।
  - Delete button দেখাবে না যদি permission `full` না থাকে।
  - HR/VAS/System item শুধু যেগুলো role-এ enabled সেগুলোই দেখাবে।
  - Custom Domain/System Log আলাদা permission ছাড়া দেখাবে না।

## Database changes needed
- Add/replace helper function for module permission check using primary role + extra roles.
- Update `clients` RLS policies to respect module permission levels.
- Recreate `app_user_effective_features` view to include extra roles.
- No new public table needed.