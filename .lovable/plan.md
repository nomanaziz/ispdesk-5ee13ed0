# Device Inventory: Smarter duplicates + ZKTeco-aware actions

দুটো জিনিস ঠিক করব:

## 1. Duplicate detection — IP + port একসাথে

**বর্তমান সমস্যা:** শুধু IP মিললেই "Duplicate" badge দেখাচ্ছে। কিন্তু router (API port 8728) আর ZKTeco (port 4370) একই public IP-তে port forwarding-এ থাকতে পারে — এটা legitimate, duplicate না।

**ফিক্স:**
- প্রতিটি source table থেকে port column-ও fetch করব:
  - `mikrotik_devices.api_port`
  - `olt_devices.port`
  - `zkteco_devices.port`
  - `device_admin_managed_devices.port`
  - `pop_devices` — port column নেই, `null` ধরব
- Duplicate key = `ip:port` (port null হলে শুধু ip)
- শুধু তখনই "Duplicate" badge দেখাবে যখন **একই IP + একই port** এ একাধিক device থাকবে
- IP cell-এ port-ও visible দেখাব: `103.147.107.13:8728` — তাহলে user বুঝবে কোনটা কোন port-এ

## 2. ZKTeco-aware action buttons

**বর্তমান সমস্যা:**
- Edit click করলে "এই source-এর device edit করা যায় না" toast দেখায় — তাহলে button-টা দেখানোরই দরকার নেই
- Inspect click করলে VLAN / VLAN IP / interface tab আসে — এগুলো MikroTik/OLT-এর জিনিস, ZKTeco-তে অর্থহীন

**ফিক্স — ZKTeco row-এ:**
- **Inspect** button → ZKTeco devices page-এ redirect (`/dashboard/hr/zkteco-devices`) — যেখানে device-এর users, attendance logs দেখা যায়
- **Edit** button → ZKTeco devices page-এ redirect (যেখানে full edit করা যায়)
- **Delete** button → আগের মতো থাকবে

**MikroTik row-এ:** Edit button আগের মতো MikroTik servers page-এ redirect করবে।

**device_admin_managed_devices source:** Edit dialog খুলবে আগের মতো।

**অন্য source (olt/pop) যেগুলো edit support করে না:** Edit button hide করব (toast-only-এর বদলে)।

## পরিবর্তিত ফাইল
- `src/pages/dashboard/device-admin/Devices.tsx` — port fetch, dup logic, action button conditional

কোনো DB migration লাগবে না।
