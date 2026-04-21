

## লক্ষ্য
আপনি বলেছেন full workflow:
**MikroTik → Unexported → Export to Admin Client / Export to POP Reseller → POP-এর "MikroTik Users" → Single বা Bulk-এ Active Billing Client বানানো।**

বর্তমান codebase-এ ৭০% logic ইতিমধ্যে আছে। সেটা সাজিয়ে এক consistent flow বানাব এবং reseller portal-এ missing **Bulk Client Import** যোগ করব।

## বর্তমান অবস্থা (যা কাজ করছে)

| Stage | Page/Logic | Status |
|---|---|---|
| MikroTik → Unexported pull | `Import.tsx` + `fetch-mikrotik-ppp` edge fn → `mikrotik_clients` table | ✅ আছে |
| Pending list + checkbox + filter | `Import.tsx` (server/protocol/profile/user-type filter) | ✅ আছে |
| Export to Admin Client (single) | `exportToClientList()` → prefill AddClient | ✅ আছে |
| Export to POP Reseller (bulk) | `TransferToPopDialog` → POP + MikroTik সিলেক্ট → `transferred_to_pop_id` set | ✅ আছে |
| Reseller portal "MikroTik Users" view | `ResellerMikrotikUsers.tsx` at `/pop-admin/mikrotik-users` | ✅ আছে |
| Admin-side Bulk → Client | `BulkImport.tsx` (xlsx + auto-load unmatched) | ✅ আছে |

## যা missing — এটাই add করব

### 1. Admin-side **"Export to Client List" (bulk)**
এখন শুধু single row-এ `ExternalLink` বাটন আছে। Selected (checkbox) multiple users একসাথে Admin-এর own client list-এ পাঠানোর কোনো button নেই।

➜ `Import.tsx`-এ "POP-এ ট্রান্সফার" button-এর পাশে নতুন **"Client লিস্টে এক্সপোর্ট ({n})"** button:
- Confirm dialog → default profile/zone optional সিলেক্ট
- Selected MikroTik users-কে `clients` table-এ insert (active billing client না — `status='unverified'` রেখে)
- `mikrotik_clients.exported = true, exported_to = 'client_list'` mark

### 2. Reseller Portal — **Single Export → Active Client**
এখন `ResellerMikrotikUsers` শুধু list দেখায় + enable/disable। MikroTik user-কে আসল billing client বানানোর action নেই।

➜ Action column-এ নতুন **"ক্লায়েন্ট বানান"** button → ছোট dialog:
- Name, Mobile, Address, Package (POP-এর tariff থেকে), Zone/Sub-zone, Joining/Expire date
- Save → `clients` table-এ insert (`branch_id` = POP-এর branch, `status='active'`), মূল `mikrotik_clients` row-এ `client_id` link store।

### 3. Reseller Portal — **Bulk Client Import (নতুন page)**
নতুন page: `/pop-admin/mikrotik-users/bulk-create`
- POP-এর সব transferred MikroTik users-কে editable spreadsheet-style table-এ load (`BulkImport.tsx`-এর pattern reuse)
- Auto-fill: UserName, Password, Profile, Server
- Editable: Name, Mobile, Address, Package, Zone, Joining Date, Expire Date
- Multi-select checkbox + "Selected ক্লায়েন্ট তৈরি করুন" button → bulk insert into `clients` (POP-scoped `branch_id`)
- "MikroTik থেকে রিফ্রেশ" button — fresh transferred users টানবে

### 4. Reseller sidebar update
`/pop-admin/mikrotik-users` পেইজের header-এ link: **"Bulk Client Import →"**

### 5. Status separation (clarity)
তিন stage clearly distinguishable হবে already-existing flag-গুলো দিয়ে:

```text
mikrotik_clients
  ├─ exported=false, transferred_to_pop_id=NULL  → "Unexported"  (Admin Import page)
  ├─ transferred_to_pop_id=<pop>, client_id=NULL → "Transferred, not onboarded" (Reseller MikroTik Users)
  └─ client_id=<uuid>                            → "Active Billing Client" (Reseller Client List)
```

`mikrotik_clients`-এ যদি `linked_client_id` column না থাকে, একটা migration যোগ করতে হবে (nullable uuid)। এটা verify করব implementation-এ গিয়ে।

## ফাইল পরিবর্তনের তালিকা

| ফাইল | কাজ |
|---|---|
| `src/pages/dashboard/mikrotik/Import.tsx` | "Client লিস্টে এক্সপোর্ট" bulk button + dialog |
| `src/pages/reseller/ResellerMikrotikUsers.tsx` | Action column-এ "ক্লায়েন্ট বানান" + Link to bulk page |
| `src/pages/reseller/ResellerMikrotikBulkCreate.tsx` | **নতুন** — POP-scoped bulk client creation |
| `src/App.tsx` | নতুন route `/pop-admin/mikrotik-users/bulk-create` |
| Migration (যদি লাগে) | `mikrotik_clients.linked_client_id uuid` column |

## যা **বদলাবে না**
- কোনো existing page/route delete হবে না
- `fetch-mikrotik-ppp`, `TransferToPopDialog`, Admin `BulkImport.tsx` — সব আগের মতই কাজ করবে
- কোনো RLS / permission logic বদলাবে না

approve করলে exact column verify করে এক migration (যদি লাগে) + ৪টি file change apply করব।

