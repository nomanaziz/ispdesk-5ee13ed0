
# Block Profile — Per-Server Mapping

আপনার screenshot অনুযায়ী ঠিক বুঝেছি: প্রতিটা MikroTik server-এ একটাই block profile থাকবে, এবং সেই server-এর সব user blocked হলে ওই profile-এ যাবে। POP/Reseller override-এর দরকার নেই — mapping সরাসরি MikroTik device-এর সাথে।

## যা পরিবর্তন হবে

### 1. Database
- `mikrotik_devices` table-এ নতুন column: `block_profile_name text` (nullable)
- পুরোনো `branch_managers.suspension_mode` ও `block_profile_name` column দুটো আর ব্যবহার হবে না — রেখে দেব (data loss এড়াতে), পরে cleanup করা যাবে
- `clients.original_profile` আগের মতই থাকবে (restore-এর জন্য)
- `system_settings.auto_suspension` JSON-এ শুধু `mode` ("disable" বা "block_profile") থাকবে, global `block_profile_name` আর লাগবে না

### 2. Edge Function: `enforce-expired-disable`
- Global `mode` পড়বে
- `block_profile` mode হলে: প্রতিটা expired client-এর `mikrotik_id` দিয়ে সেই device-এর `block_profile_name` লাগাবে
- যদি ওই device-এ block profile set না থাকে → ওই client skip করবে (warning log)
- বাকি logic আগের মতই: `original_profile` save → profile change → payment-callback-এ restore

### 3. UI — Auto-Suspension Scheduler page (`/dashboard/billing/auto-suspension`)
এখানেই on/off ও mapping দুটোই থাকবে:
- **Master switch:** Enable/Disable auto-suspension (আগে থেকেই আছে)
- **Mode radio:** "Disable user" / "Set Block Profile" (আগে থেকেই আছে, শুধু global block profile input বাদ দেব)
- **নতুন section — "Server-wise Block Profile Mapping":** আপনার screenshot-এর মত table — বাঁয়ে MikroTik server নাম, ডানে dropdown (ওই device থেকে fetch করা available profile list)। Save করলে `mikrotik_devices.block_profile_name` update হবে।

### 4. Payment restore
আগের মতই থাকবে — `original_profile` থেকে restore হবে।

## কোথা থেকে on/off করবেন
**Dashboard → Billing → Auto-Suspension Scheduler** page থেকেই সব কিছু:
- পুরো auto-suspension on/off
- Mode: Disable / Block Profile
- প্রতি server-এর block profile mapping

আলাদা কোনো page-এ যেতে হবে না।

## Technical notes
- POP override অংশ (`branch_managers.suspension_mode` UI + edge function override logic) সরিয়ে দেব
- `fetch-mikrotik-profiles` edge function আগে থেকেই আছে — সেটাই ব্যবহার করব dropdown populate-এর জন্য
- পুরোনো column drop করব না, শুধু UI/logic থেকে সরাব

Approve করলে migration + code changes একসাথে করব।
