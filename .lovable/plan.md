

## Device Administration — Simplification Plan

আপনার পুরাতন project-এর মত simple রাখব। ৩টা মূল পরিবর্তন:

### ১. Bulk User Deploy → Popup-এ রূপান্তর
- আলাদা wizard page বাদ। **Devices ইনভেন্টরি page**-এ উপরে "Deploy User" এবং "Remove User" বাটন।
- Click → একটাই dialog খুলবে যেখানে:
  - Username, Password, Permission (Read/Write/Full)
  - "All Select" checkbox + device list (filter by type)
  - Submit → সব device-এ একসাথে job তৈরি
- পুরাতন stepper page দুইটা (`/deploy-user`, `/delete-user`) sidebar থেকে remove।

### ২. নতুন "All Device Users" page (`/dashboard/device-admin/users`)
**মূল feature:** সব device থেকে user list pull করে এক table-এ দেখাবে।

```text
| Username | Devices (count) | Permission | Last seen | Actions |
| noman    | 5 devices       | full/write | ...       | View / Delete-all |
```

- **Username search** → "noman" লিখলে সব device থেকে যেখানে এই user আছে দেখাবে
- Row click → expand করে দেখাবে কোন কোন device-এ আছে + কী permission
- Per-device delete OR "Delete from all" button
- Data source: edge function `fetch-device-users` যা MikroTik API + OLT + Switch + ZKTeco থেকে user list pull করে cache করবে `device_admin_user_inventory` table-এ

**নতুন table:**
```sql
device_admin_user_inventory (
  id, username, device_type, device_id, device_name,
  permission, last_synced_at, raw_data jsonb
)
```
+ "Refresh" button যা edge function কল করে সব device থেকে fresh data আনে।

### ৩. Schedule page-এ User Add/Remove যোগ
বর্তমানে শুধু backup schedule আছে। যোগ হবে:
- **Schedule type:** Backup / Add User / Remove User
- Add User: username, password, permission, devices, run_at (একবার বা recurring)
- Remove User: username, devices, run_at (যেমন: ৩০ তারিখে noman remove from all routers)

`device_admin_schedules` table-এ already `schedule_type` আছে — শুধু `'add_user'`, `'remove_user'` value support করতে হবে + `payload jsonb` (username, password, permission, target_devices, run_at)। UI-এ tabs: ব্যাকআপ / ইউজার অ্যাড / ইউজার রিমুভ।

### ৪. App User তৈরির সময় MikroTik Access (bonus)
`src/pages/dashboard/system/Users.tsx` — নতুন user wizard-এর শেষে optional step:
- "এই user-কে MikroTik device-এ access দিন?" toggle
- On → online MikroTik device list checkbox + permission select
- Submit হলে background-এ deploy job তৈরি

### Files to change
- **New:** `src/pages/dashboard/device-admin/AllDeviceUsers.tsx`
- **New:** `src/components/device-admin/DeployUserDialog.tsx`, `RemoveUserDialog.tsx`
- **New:** `supabase/functions/fetch-device-users/index.ts` (MikroTik API থেকে user pull)
- **Edit:** `Devices.tsx` — উপরে Deploy/Remove buttons
- **Edit:** `Schedules.tsx` — type tabs (backup/add_user/remove_user)
- **Edit:** `AppSidebar.tsx` — `/deploy-user` ও `/delete-user` remove, `/users` add
- **Edit:** `App.tsx` — routes update
- **Edit:** `system/Users.tsx` — optional MikroTik access step in new user wizard
- **Migration:** add `device_admin_user_inventory` table + extend `device_admin_schedules` with `payload jsonb`, allow `schedule_type` values `'add_user'`, `'remove_user'`

### Sidebar (final)
```text
ডিভাইস অ্যাডমিনিস্ট্রেশন
  ├─ ড্যাশবোর্ড
  ├─ ডিভাইস ইনভেন্টরি  (Deploy/Remove buttons এখানে)
  ├─ অল ডিভাইস ইউজার   ← নতুন
  ├─ গ্রুপ
  ├─ ব্যাকআপ সেন্টার
  ├─ শিডিউল ম্যানেজার  (backup + user add/remove)
  └─ অডিট লগ
```

**Note:** MikroTik থেকে actual user pull করার জন্য existing `fetch-mikrotik-ppp` pattern follow করব। OLT/Switch/ZKTeco-এর জন্য placeholder adapter (পরে real API integrate করা যাবে)।

