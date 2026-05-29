
# Block Profile Enable/Disable — System Setup-এ যোগ

আপনার screenshot-এর মত — **System → Setup → Common System Settings** tab-এ একটা নতুন card যোগ করব "Mikrotik Block Profile"। বর্তমানে enable/disable Auto-Suspension Scheduler page-এ আছে, কিন্তু আপনি চান এটা Settings থেকে হোক।

## যা যোগ হবে

**Location:** `/dashboard/system/setup` → Common System Settings tab → নতুন card:

### Card: "Mikrotik Block Profile"
আপনার screenshot-এর হুবহু মত:
- **Enable / Disable radio:** চালু থাকলে expired user-দের block profile-এ পাঠাবে; বন্ধ থাকলে আগের মত MikroTik user disable হবে।
- **"Set Server-wise Block Profile" button:** click করলে modal খুলবে — modal-এ table:
  - বাঁয়ে: প্রতিটা MikroTik server-এর নাম
  - ডানে: profile dropdown (Fetch button দিয়ে ওই server থেকে profile list আনা)
- Submit করলে `mikrotik_devices.block_profile_name` update হবে।

## Backend
- কোনো DB migration লাগবে না — `mikrotik_devices.block_profile_name` column আগের session-এ আগেই add করা হয়েছে।
- Enable/disable শুধু `system_settings.auto_suspension.mode` toggle করবে (`"disable"` ↔ `"block_profile"`)। Edge function আগের মতই কাজ করবে।

## Auto-Suspension Scheduler page থেকে কী সরাবো
সেই page-এ এখন যে "Suspension Mode" dropdown ও "Server-wise Block Profile Mapping" table আছে — দুটোই সরিয়ে দেব, কারণ এখন সব System Setup-এ। শুধু run/stats/recent list থাকবে।

## কোথা থেকে on/off করবেন (final)
**Dashboard → সিস্টেম → সিস্টেম সেটআপ → Common System Settings** tab-এর "Mikrotik Block Profile" card থেকে।

Approve করলে implement করব।
