

## লক্ষ্য

বর্তমান OLT Devices page-এ sample reference (Galaxy Net + অন্য company)-এর ভাল feature গুলো combine করে একটা সম্পূর্ণ OLT add/edit form বানানো — যাতে port forwarding scenario-তেও OLT চেনা সহজ হয় এবং MikroTik integration optional থাকে।

প্রথমে current state দেখে নিই।
<lov-tool-use id="toolu_vrtx_01DsFqXz5XS6WxDiTUAsbLNE" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/olt/OltDevices.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0115KPMd9F9E7uDwW3ybLEEc" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='olt_devices' ORDER BY ordinal_position;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_012rEjejsnoMN6d5xJKjuiLW" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/olt/OltDevices.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DiMb2jrxfqeVwgURP7txWW" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='olt_devices' ORDER BY ordinal_position;\"}">
</lov-tool-use>
<lov-plan>

## লক্ষ্য

OLT add/edit form-কে দুটো reference UI-এর best parts নিয়ে combine করা — port confusion দূর করার জন্য **Alias name** এবং SNMP-থেকে **auto-pull device name** যোগ করা।

## পরিবর্তন: `src/pages/dashboard/olt/OltDevices.tsx`

### A) নতুন field যোগ
- **Alias / Display Name** — port-forward IP দেখে চেনা কঠিন, তাই user নিজের একটা পরিচিত নাম দিতে পারবে (e.g., "Madaripur-BDCOM-1")
- **Telnet Port** আলাদা (default 23) — শুধু CLI-এর জন্য
- **Wave/OLT Port** আলাদা (existing `port`) — main API/management port
- **SNMP Auto-fetch button** — SNMP enabled থাকলে "Fetch Name" button → edge function call → `sysName` OID থেকে device-এর actual name এনে `name` field-এ বসিয়ে দেবে

### B) Form layout (reference image-এর মতো section grouping)
দুটো UI কে combine করে তিনটি collapsible/labeled section:

```text
┌─ Basic Identity ─────────────────────────┐
│  Name (Alias) *      Vendor              │
│  Brand/Model         OLT Version         │
└──────────────────────────────────────────┘
┌─ Connection (CLI) ───────────────────────┐
│  IP *    Wave Port    Telnet Port        │
│  Conn Type   Username   Password         │
└──────────────────────────────────────────┘
┌─ SNMP (Monitoring) ──[Toggle]────────────┐
│  SNMP IP    SNMP Port    Version         │
│  Community           [Fetch Name button] │
└──────────────────────────────────────────┘
┌─ Linking ────────────────────────────────┐
│  Branch          MikroTik Link           │
│  Description                             │
└──────────────────────────────────────────┘
```

### C) DB migration (একটাই column)
- নতুন column: `telnet_port INT DEFAULT 23` on `olt_devices`
- `name` field already exists — alias হিসেবে use করব (label পরিবর্তন: "নাম / Alias *")
- `port` = Wave/OLT port (existing)

### D) Edge function (নতুন): `snmp-fetch-olt-name`
- Input: `{ device_id }`
- SNMP `sysName.0` (OID `1.3.6.1.2.1.1.5.0`) GET
- Output: `{ name: "..." }` → frontend form-এ auto-fill
- Note: SNMP over UDP Deno-তে limited — fallback হিসেবে `net-snmp` npm package via esm.sh, অথবা শুধু হ্যান্ডশেক test দিয়ে success/fail return

### E) Table column adjustment
- "নাম" column-এ alias দেখাবে, IP:Port সাথে Telnet port-ও tooltip-এ
- Pencil/Trash action-এর সাথে existing দেখানো ঠিক আছে

## Files

**Edit:**
- `src/pages/dashboard/olt/OltDevices.tsx` — form restructure + Alias label + Telnet Port field + Fetch Name button

**Create:**
- `supabase/functions/snmp-fetch-olt-name/index.ts` — SNMP sysName fetcher

**Migration:**
- Add `telnet_port` column to `olt_devices`

## ফলাফল

- Port-forward IP দেখে confusion শেষ — user নিজের alias দেবে অথবা SNMP থেকে auto-pull করবে
- Wave port + Telnet port আলাদা থাকায় দুটো reference UI-এর সব functionality cover হবে
- Add/Edit dialog clean section-grouped layout

