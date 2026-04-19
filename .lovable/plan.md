

## প্রসঙ্গ বুঝেছি

OLT trunk topology-তে user-to-ONU mapping চ্যালেঞ্জ:
- MikroTik PPP user-এর caller-id (MAC) আছে
- OLT-এর MAC table-এ ONU-র MAC এবং সেগুলো কোন PON port-এ আছে সেটা থাকে
- **সমস্যা**: OLT1 ↔ OLT2 trunk হলে একই client MAC দুটো OLT-তেই দেখা যাবে (uplink port দিয়ে leak করে)
- **সমাধান**: শুধু MAC match না, **PON port number**-ও check করতে হবে — uplink/trunk port বাদ দিয়ে শুধু **access PON port (GPON/EPON)** থেকে আসা MAC-ই genuine

## আর্কিটেকচার

### Data flow

```text
MikroTik PPP secrets ──► caller_id (MAC)
                            │
                            ▼
                     match by MAC
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
   OLT1 MAC table                          OLT2 MAC table
   (per-port snapshot)                     (per-port snapshot)
        │                                       │
        └────► filter: port_type='access' ◄─────┘
                            │
                            ▼
              unique ONU + PON port found
                            │
                            ▼
            user_onu_mapping (user → onu_id, pon_port, olt_id)
```

### DB schema (নতুন)

**`olt_mac_table`** — per-OLT MAC snapshot
- `id`, `olt_id` (FK), `mac` (text, indexed), `port` (text, e.g. `gpon-olt_0/1/2`), `port_type` (`access`|`uplink`|`trunk`), `vlan` (int), `seen_at` (timestamptz)
- Unique index: `(olt_id, mac, port)`

**`olt_ports`** — port classification (manual/auto)
- `id`, `olt_id`, `port_name` (e.g. `0/1/2`, `xgei-0/1`), `port_type` (`access_pon`|`uplink_trunk`|`management`), `description`
- User edit করতে পারবে: কোনটা PON access port, কোনটা uplink

**`user_onu_mapping`** (existing extend)
- + `pon_port` (text), + `match_method` (`mac+port`|`mac_only_ambiguous`|`unmapped`)

### Edge functions (নতুন)

1. **`snmp-fetch-olt-mac-table`** — OLT-এর Bridge-MIB (`1.3.6.1.2.1.17.4.3.1.x`) বা vendor-specific OID থেকে MAC↔port snapshot pull করে `olt_mac_table`-এ insert
2. **`map-users-to-onu`** — improved logic:
   - প্রতি PPP user-এর MAC নাও
   - সব OLT-র `olt_mac_table` query করো `WHERE port_type='access'`
   - exactly one match → confident mapping
   - multiple matches (trunk leak) → port_type filter দিয়ে narrow → তবু একাধিক হলে `mac_only_ambiguous` flag

### UI পরিবর্তন

**`OltDevices.tsx`** — row action যোগ:
- "Sync MAC Table" button (per OLT) → edge function trigger

**নতুন page: `OltPorts.tsx`** (`/dashboard/olt/ports`)
- প্রতি OLT-র port list, dropdown দিয়ে `access_pon` / `uplink_trunk` mark করা
- "Auto-detect" button: যে port-এ ONU MAC বেশি দেখা যায় সেটা access, যেটায় বিভিন্ন vendor MAC mixed সেটা uplink

**`OltUsers.tsx` / `OnuList.tsx`** — extra column:
- "Mapped User" + ambiguity badge (যদি একই MAC দুই OLT-তে থাকে)

## Files

**Migration:**
- `olt_mac_table` table + indexes
- `olt_ports` table
- `user_onu_mapping` ALTER → add `pon_port`, `match_method`

**Create:**
- `supabase/functions/snmp-fetch-olt-mac-table/index.ts`
- `supabase/functions/map-users-to-onu/index.ts` (new improved version, পুরোনো `trigger-mapping` deprecated)
- `src/pages/dashboard/olt/OltPorts.tsx`

**Edit:**
- `src/pages/dashboard/olt/OltDevices.tsx` — "Sync MAC" action button
- `src/pages/dashboard/olt/OnuList.tsx` — mapped-user column + ambiguity badge
- `src/components/AppSidebar.tsx` + `src/App.tsx` — OLT Ports route

## ফলাফল

- OLT1↔OLT2 trunk হলেও সঠিক ONU-তে user assign হবে কারণ uplink port-এ পাওয়া MAC বাদ পড়বে
- Ambiguous case-গুলোতে badge দেখাবে — manually verify করা যাবে
- Port classification একবার set করলে future sync স্বয়ংক্রিয়ভাবে কাজ করবে

