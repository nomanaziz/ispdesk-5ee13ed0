আপনার concept পরিষ্কার: Bandwidth Reseller/POP Admin নিজে client business চালাবে, তাই সে নিজের zone, subzone, package, MikroTik profile mapping, employee, bulk import, client list, billing list manage করতে পারবে। এটা Main Admin-এর মতোই হবে, কিন্তু নিজের branch/scope-এর ভিতরে সীমাবদ্ধ থাকবে। MAC Reseller-এর মতো tariff-dependent/locked model এখানে চলবে না।

Plan:

1. BW panel identity/scope ঠিক করা
- `bw_customer` token থেকে `branch_id` হিসেবে `panel_branch_id` resolve করব, যাতে সব existing POP-scoped admin pages ঠিকমতো BW panel-এ কাজ করে।
- `usePopScope()`-এ BW panel context properly support করব: `isPopMode=true`, `branchId=panel_branch_id`, কিন্তু `tariffId=null`।
- Result: Add Client, Zone, Subzone, Billing, Employee, Reports সব একই branch scope পাবে।

2. BW panel menu/routes Main Admin/POP Admin pattern অনুযায়ী expand করা
- BW sidebar-এ missing groups যোগ করব:
  - Configuration: Zone, Sub Zone, Box, Package, Department, Designation, Device
  - MikroTik: MikroTik Servers, MikroTik Users/Profile source, Bulk user import
  - Client: Add Client, Client List, Bulk Client Import, Billing List, Daily Collection, Left Clients, Scheduler
  - Employee: Add Employee, Employee List, Salary Sheet
  - Billing/Monitoring/SMS/Reports/Accounting/System যেগুলো already reusable আছে সেগুলো route সহ expose করব।
- Active menu/submenu highlight main portal style-এ consistent করব, যাতে click করলে selected submenu clearly active থাকে।

3. BW reseller-এর নিজস্ব package system বানানো
- Current POP package page tariff-based (`reseller_tariff_packages`) — এটা BW panel-এর জন্য ভুল।
- BW panel package page হবে self-owned packages:
  - package name
  - monthly price
  - bandwidth/speed
  - protocol
  - MikroTik server
  - MikroTik profile mapping
  - status
- Packages BW reseller-এর own `branch_id`/scope দিয়ে save/filter হবে।
- Add Client form package dropdown এই own packages থেকেই আসবে; tariff warning/dropdown আর থাকবে না।

4. Add Client form BW reseller model অনুযায়ী ঠিক করা
- BW panel-এ Add Client package/profile/server locked বা tariff-based হবে না।
- BW reseller নিজের package নির্বাচন করবে, package থেকে monthly bill/profile/server auto-fill হবে, কিন্তু প্রয়োজন হলে নিজের MikroTik profile mapping অনুযায়ী কাজ করবে।
- “tariff assigned নেই” warning সম্পূর্ণ remove থাকবে BW panel context-এ।
- Client insert সরাসরি BW branch scope-এ হবে, prepaid POP wallet/tariff validation ছাড়া।

5. Bulk import এবং MikroTik user import BW scope-এ চালু করা
- BW panel bulk import-এ direct admin/global table read না করে portal-data scoped API ব্যবহার করব।
- MikroTik থেকে unmatched/bulk users আনলে শুধু এই BW reseller-এর MikroTik/branch data দেখাবে।
- Imported users client list-এ `branch_id=panel_branch_id` সহ save হবে।

6. Existing reusable admin pages scoped করা
- Zone/Subzone/Box pages already partially POP-scoped; BW panel scope ঠিক হলে এগুলো reusable হবে।
- যেসব pages direct Supabase query করে global data দেখায়, সেগুলো `usePopScope()` দিয়ে branch filter করব।
- Delete/update operations-এও branch guard রাখব, যেন অন্য admin/POP data modify না হয়।

7. Validation
- `/bw/panel/clients/add`-এ warning/package issue verify করব।
- `/bw/panel/config/zones`, `/bw/panel/config/sub-zones`, `/bw/panel/config/packages` route/menu verify করব।
- Add Client → package select → client save → client list/billing list-এ scoped result দেখা যাচ্ছে কিনা verify করব।
- Sidebar menu disappearing/active submenu highlight regression check করব।