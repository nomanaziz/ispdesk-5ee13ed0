## সমস্যা কী হচ্ছে

আপনি OLT যোগ করেছেন **Device Admin** পেজ থেকে (`/dashboard/device-admin/devices`)। সেটা DB-তে গেছে `device_admin_managed_devices` টেবিলে (category=olt, vendor=bdcom, IP 103.147.107.1)।

কিন্তু `/dashboard/olt` (OLT Devices) এবং OLT Overview পেজ শুধু পুরোনো `olt_devices` টেবিল থেকে পড়ে — সেখানে এখনো ০ row। তাই Total OLT = 0, Online/Offline ONU = 0।

ONU counts (online/offline/total) আসে polling agent বা SNMP poll করে `onu_list` টেবিলে রো ঢোকার পর — manual add থেকে ONU আসে না, OLT কে actually poll করতে হয়।

## সমাধান (২ ধাপে)

### ধাপ ১ — Device Admin ↔ OLT Devices sync (এক জায়গায় add, সব জায়গায় দেখা যাবে)

DB trigger বানাবো `device_admin_managed_devices` টেবিলে:
- যখন `category = 'olt'` row insert/update হবে → একই id দিয়ে `olt_devices` টেবিলে mirror row insert/update হবে (name, ip_address, vendor, snmp_*, agent_*, data_source_priority সব কপি)
- delete হলে mirror row-ও delete হবে
- existing BDCOM OLT backfill করা হবে

এর ফলে: Device Admin থেকে OLT add করলেই `/dashboard/olt`, OLT Overview, OLT Mobile — সব জায়গায় auto দেখা যাবে। দুইটা আলাদা জায়গায় add করতে হবে না।

### ধাপ ২ — Manual "Sync now" বাটন + status feedback

`/dashboard/olt` (OLT Devices) টেবিলের প্রতিটা row-তে একটা **"Sync now"** আইকন বাটন যোগ করবো। ক্লিক করলে:
- existing `snmp-poll-device` edge function কে call করবে (vendor=bdcom হলে BDCOM OID profile use করবে)
- success হলে toast দেখাবে: "X ONUs synced", এবং `last_seen` + `total_onus` + `online_onus` update হবে
- fail হলে exact error message দেখাবে (SNMP timeout / wrong community / agent offline ইত্যাদি)

এছাড়া top-এ একটা **"Sync All"** বাটন থাকবে যা সব OLT এক সাথে poll করবে।

OLT Overview-এর stat cards-এ একটা ছোট note থাকবে: *"ONU data syncs every N minutes — last sync: X"*।

## Technical Details

**Migration:**
```sql
-- Trigger function: mirror category='olt' rows into olt_devices
CREATE OR REPLACE FUNCTION sync_managed_device_to_olt() ...
CREATE TRIGGER trg_sync_olt AFTER INSERT OR UPDATE OR DELETE
  ON device_admin_managed_devices FOR EACH ROW
  EXECUTE FUNCTION sync_managed_device_to_olt();

-- Backfill existing OLT rows
INSERT INTO olt_devices (id, name, ip_address, vendor, ...)
  SELECT id, name, ip_address, vendor, ...
  FROM device_admin_managed_devices WHERE category='olt'
  ON CONFLICT (id) DO UPDATE SET ...;
```

**Files to edit:**
- New migration (trigger + backfill)
- `src/pages/dashboard/olt/OltDevices.tsx` — "Sync now" + "Sync All" বাটন, `supabase.functions.invoke("snmp-poll-device", { body: { olt_id } })`
- `src/pages/dashboard/OltOverview.tsx` — last sync time indicator

**যা change হবে না:** existing `snmp-poll-device` / `sync-olt-data` edge functions, AddDeviceDialog, Device Admin Devices পেজ।

## নোট

আপনার BDCOM OLT (103.147.107.1) এ SNMP community `GxNsnMP_RO`, port 173 set করা আছে। trigger run করার পর `/dashboard/olt` এ এটা দেখা যাবে এবং "Sync now" চাপলে actual ONU data fetch হবে — যদি OLT থেকে SNMP reply আসে।
