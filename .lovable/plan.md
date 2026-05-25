# Device Inventory ফিক্স প্ল্যান

আপনার ৪টা সমস্যা একসাথে সমাধান করব:

## ১. Type vs Vendor confusion ঠিক করা
এখন টেবিলে "Type" কলামে MikroTik (যেটা আসলে vendor) দেখাচ্ছে। ঠিক করব:

- **Type/Category column** = Router, OLT, Switch, Access Point, Server, PPPoE Server, ZKTeco
- **Vendor column** (নতুন আলাদা) = MikroTik, Cisco, VSOL, BDCOM ইত্যাদি
- `mikrotik_devices` table-এর সব row → Type = "Router", Vendor = "MikroTik"
- `olt_devices` → Type = "OLT", Vendor = device-এর vendor field
- `pop_devices` → Type = "Switch", Vendor = device-এর vendor (থাকলে)
- `device_admin_managed_devices` → Type = category field, Vendor = vendor field

Filter dropdown-এও "MikroTik" বদলে "Router" আসবে, পাশে আলাদা Vendor filter যোগ হবে।

## ২. Duplicate IP prevent করা
একই IP-তে দুটো router add হয়ে যাচ্ছে। ঠিক করব:

- **Add Device dialog**-এ submit-এর আগে check: একই IP যেকোনো table-এ আছে কিনা (mikrotik_devices, olt_devices, pop_devices, device_admin_managed_devices)। থাকলে error toast: "এই IP ইতিমধ্যে আছে: [device name]"।
- **DB level**: `mikrotik_devices.ip_address` এবং `device_admin_managed_devices.ip_address` কলামে partial unique index যোগ করব (NULL বাদে)। ফলে DB-ও duplicate block করবে।
- **পুরনো duplicate cleanup**: শুধু সর্বশেষ-create হওয়া row রেখে বাকি duplicate গুলো soft-delete করার জন্য SQL দিব — কিন্তু আপনার approval ছাড়া কিছু delete করব না। আপাতত শুধু duplicate detect করে UI-তে warning badge দেখাব ("⚠ Duplicate IP")।

## ৩. Delete button + Admin permission
প্রত্যেক row-এর Action কলামে এখন শুধু Inspect (🔍) আছে। যোগ করব:

- 🗑 **Delete button** — শুধু admin role থাকলে দেখাবে।
- Confirmation dialog: "এই device delete করবেন? এই কাজ ফিরিয়ে আনা যাবে না।"
- Delete করলে সংশ্লিষ্ট table থেকে row remove হবে (mikrotik_devices / olt_devices / pop_devices / device_admin_managed_devices)।
- Permission key: `device.delete` — existing `usePermission` hook দিয়ে check করব। Admin role-এর জন্য RPC `has_device_permission('device.delete')` true return করবে।

## ৪. Role/Permission আগে থেকেই আছে
আপনার project-এ already `usePermission` hook + `has_device_permission` RPC আছে (memory অনুযায়ী Super Admin/Admin/Operator roles আছে)। নতুন কিছু লাগবে না — শুধু `device.delete` এবং `device.add` permission keys ব্যবহার করব:

- "ডিভাইস যোগ" button → `device.add` permission না থাকলে hidden
- Delete icon → `device.delete` permission না থাকলে hidden
- Inspect → সবাই দেখতে পারবে (read-only)

ভবিষ্যতে admin panel-এ permission toggle করে অন্য user-কেও দিতে পারবেন।

## কোন কোন file বদলাবে

1. `src/pages/dashboard/device-admin/Devices.tsx` — Type/Vendor কলাম আলাদা, Delete button, permission gates, duplicate badge
2. `src/components/device-admin/AddDeviceDialog.tsx` — submit-এর আগে duplicate IP check
3. **নতুন migration** — `mikrotik_devices.ip_address` ও `device_admin_managed_devices.ip_address`-এ unique index; কোনো data delete হবে না

## যা বদলাবে না
- Mikrotik → Servers page থেকে যে auto-sync হয়, ওটা একই থাকবে (সেখানেই duplicate prevention যোগ হবে future task হিসেবে)
- OID Library, polling logic, edge functions — কিছু touch করব না

approve করলে implementation শুরু করব।