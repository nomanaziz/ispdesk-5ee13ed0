## যা যোগ হবে

### ১. Edit বাটন — IP / SNMP port / সব ফিল্ড modify

Devices page (`/dashboard/device-admin/devices`) এর প্রতি row-তে এখন শুধু Inspect + Delete আছে — Edit নাই। যোগ করবো:

- প্রতি row-তে **✏️ Edit** আইকন (Inspect ও Delete এর মাঝে)
- ক্লিক করলে `AddDeviceDialog` ই open হবে কিন্তু **edit mode**-এ — সব ফিল্ড (Name, IP, SNMP port, community, version, vendor, credentials, location ইত্যাদি) prefilled থাকবে, Title "ডিভাইস Edit করুন" দেখাবে, Save করলে UPDATE হবে (INSERT না)।
- শুধু `device_admin_managed_devices` source-এর row-গুলো edit হবে। MikroTik row (যেটা `mikrotik_devices` থেকে auto-sync হয়) edit করতে হবে **Mikrotik → Servers** পেজে — সেটা edit-এ click করলে redirect হবে। OLT mirror row edit করলে DB trigger তা automatic `olt_devices`-এ propagate করবে।

### ২. Inspector — সব device type এ Users / Interfaces / VLANs

এখন Inspector শুধু MikroTik এর জন্য কাজ করে। সব category-তে কাজ করতে `inspect-device` edge function-এ adapter pattern বানাবো — একটাই dialog, একটাই UI, কিন্তু backend device-এর type অনুযায়ী আলাদা source থেকে data নিবে।

**Adapter mapping:**

| Category | Users | Interfaces | VLANs | VLAN-IP |
|---|---|---|---|---|
| **mikrotik** (router) | `/user/print` (API) | `/interface/print` | `/interface/vlan/print` | `/ip/address/print` filter vlan |
| **olt** | `onu_list` table (mac, customer, status, rx_power) | OLT PON/uplink ports — SNMP via oid_profile বা existing `olt_ports` table | service-VLAN list (SNMP walk বা manual config) | — |
| **switch / pop_device** | "—" (switches usually no user list) | `snmp-fetch-switch-ports` result | SNMP dot1qVlanStaticTable walk | — |
| **generic SNMP device** (yes oid_profile_id) | device's oid_profile-এর "users" metric_key walk | oid_profile-এর "interfaces" walk | "vlans" walk | "vlan_ips" walk |
| **zkteco** | `device_admin_user_inventory` rows for this device | — | — | — |

**একটি OID-driven implementation:** Switch ও generic SNMP device একই code path use করবে — `oid_profile_id` থেকে metric mapping বের করে SNMP walk করে রো বানাবে। এতে নতুন vendor-এর জন্য শুধু `device_oid_profiles` + `device_oid_mappings`-এ entry দিলেই inspector কাজ করবে, কোড touch করতে হবে না।

**UI side (DeviceInspectorDialog):** সব tabs সব type-এ দেখাবে, কিন্তু adapter empty data return করলে "এই device type এ X support নাই" message দেখাবে। ভুল alert ("শুধু MikroTik supported") সরে যাবে।

## Technical Details

**Files to edit:**
- `src/components/device-admin/AddDeviceDialog.tsx` — accept `editDevice?: Row` prop; mode === 'edit' হলে UPDATE করবে এবং duplicate-IP check থেকে নিজের id বাদ দিবে।
- `src/pages/dashboard/device-admin/Devices.tsx` — Edit আইকন + state `editTarget`, MikroTik row হলে navigate to `/dashboard/mikrotik/servers`।
- `src/components/device-admin/DeviceInspectorDialog.tsx` — alert message সরানো, adapter-aware empty state।
- `supabase/functions/inspect-device/index.ts` — switch-case on device_type (mikrotik/olt/switch/generic/zkteco), `oid_profile_id` থাকলে generic SNMP walker call করবে। Existing `snmp-fetch-switch-ports` / `onu_list` reuse করবে — নতুন SNMP code minimal।

**কোনো DB migration লাগবে না** — সব existing table ব্যবহার হবে।

## নোট

OID-driven inspector পুরোপুরি কাজ করতে হলে প্রতিটা ভেন্ডরের জন্য `device_oid_mappings`-এ "users / interfaces / vlans / vlan_ips" metric_key গুলোর OID entry থাকতে হবে। যেগুলো অনুপস্থিত সেগুলোর জন্য Inspector "OID profile-এ এই resource defined নাই" দেখাবে।
