

## লক্ষ্য
Admin → POP Profile page-এ "Exported Clients" ও "Unexported Clients" tab দুটোর meaning ঠিক করা, Revert action সঠিকভাবে কাজ করানো, এবং একটি নতুন "Left Clients" tab যোগ করা যেখান থেকে admin bulk delete করতে পারবে।

## এখনকার সমস্যা (uploaded screenshot vs আমাদের code)
| Tab | এখন আমরা কী দেখাচ্ছি | আসলে কী দেখানো উচিত |
|---|---|---|
| **Exported** | `clients` table-এর সব row | যেসব `mikrotik_clients` কে POP **client-এ convert করেছে** (যাদের `linked_client_id` set আছে) |
| **Unexported** | `mikrotik_ppp_secrets` থেকে raw filter | যেসব `mikrotik_clients` POP এর scope-এ আছে কিন্তু `linked_client_id IS NULL` |
| **Revert button** | শুধু `clients.status='left'` row touch করে — MikroTik mapping ঠিক করে না | mikrotik_clients থেকে POP transfer clear করে দিতে হবে → user আবার admin "Import from MikroTik"-এ আসবে |
| **Left Clients** | নেই | নতুন tab — bulk delete option সহ |

## নতুন tab structure (Admin POP Profile → ডান পাশে)
1. **POP Info** (অপরিবর্তিত)
2. **Exported Clients** — fixed
3. **Unexported Clients** — fixed + working Revert
4. **Left Clients** — নতুন
5. বাকি tabs অপরিবর্তিত

---

## কী করা হবে

### ১) Exported Clients tab — সঠিক definition
Query বদল:
- Source: `mikrotik_clients` যেখানে এই POP-এর scope (branch_id = pop.branch_id **OR** transferred_to_pop_id = pop.id) এবং `linked_client_id IS NOT NULL`
- Join `clients` table-এ linked client-এর info আনার জন্য (name, package, status, online, mobile, MAC, IP)
- Columns screenshot অনুযায়ী: ID, User ID/IP, Password (eye toggle), Customer Name, Mobile, Zone, Client Type, Package, Private IP, MAC, Server, B.Status, M.Status

### ২) Unexported Clients tab — সঠিক definition + working Revert
Query বদল:
- Source: same `mikrotik_clients` scope কিন্তু `linked_client_id IS NULL`
- Columns: Name, Password (eye toggle), Package/Profile, Protocol, Profile, Server Name, R.Days, Enabled, **Revert button**

**Revert action (নতুন edge function action):**
নতুন `portal-data` action না — এটা admin side, তাই direct mutation:
```ts
// Revert: এই MT user-কে POP scope থেকে বের করো
update mikrotik_clients
  set transferred_to_pop_id = null,
      transferred_to_mikrotik_id = null,
      transferred_at = null,
      branch_id = null
  where id = ?
```
ফলে user টা আবার admin Mikrotik Import page-এ "available / untransferred" হিসেবে আসবে এবং অন্য POP-এ assign করা যাবে।

### ৩) নতুন **Left Clients** tab
- Source: `clients` table যেখানে `branch_id = pop.branch_id` এবং `status IN ('left', 'inactive')`
- Columns: Client ID, Name, Username, Mobile, Package, Left Date, Action (single delete) + checkbox
- Top-এ buttons:
  - **Bulk Delete** (selected rows)
  - **Delete All Left Clients** (with confirmation dialog)
- Single delete button প্রতি row-তে
- Delete করলে: `clients` row delete → existing trigger (`process_credit_refund_on_client_left`) prepaid POP হলে refund handle করবে → ওই client-এর সাথে linked `mikrotik_clients` row থাকলে তার `linked_client_id = null, exported = false` করতে হবে যাতে চাইলে আবার convert করা যায়

### ৪) Confirmation + safety
- Bulk delete-এ AlertDialog ("X জন left client delete করবেন? এটা আর ফিরে আসবে না")
- Revert-এ AlertDialog ("এই user MikroTik import pool-এ ফেরত যাবে — POP আর দেখতে পাবে না")
- সব mutation success/error toast

### ৫) UX details
- প্রতিটা table-এ search box, page size, status filter
- Password field-এ eye toggle (existing pattern)
- Loading skeleton + empty state Bangla copy
- Counts tab label-এ দেখাবে: `Exported (12)`, `Unexported (3)`, `Left (5)`

---

## কোন file বদলাবে
| File | পরিবর্তন |
|---|---|
| `src/pages/dashboard/branches/PopProfile.tsx` | ৩টা tab-এর query + UI rewrite, নতুন Left tab যোগ |
| `src/components/branches/PopExportedClients.tsx` *(নতুন)* | Exported tab component (table, filters, eye toggle) |
| `src/components/branches/PopUnexportedClients.tsx` *(নতুন)* | Unexported tab + Revert flow |
| `src/components/branches/PopLeftClients.tsx` *(নতুন)* | Left clients tab + bulk delete |

## কোন file বদলাবে না
- POP portal (reseller side) — শুধুমাত্র admin POP Profile page-এ পরিবর্তন
- RLS policies, schema, edge functions
- বর্তমান delete trigger (refund logic অপরিবর্তিত থাকবে)

## Database migration লাগবে?
**না।** সব column ইতোমধ্যে আছে (`mikrotik_clients.linked_client_id`, `transferred_to_pop_id`, `branch_id`; `clients.status`)।

---

## Apply-এর পরে expected ফলাফল
1. ✅ **Exported Clients** tab → শুধু সেই MT user দেখাবে যাদের POP "ক্লায়েন্ট বানান" করেছে
2. ✅ **Unexported Clients** tab → শুধু POP-এর scope-এ থাকা unconverted MT user
3. ✅ **Revert** → user MikroTik Import pool-এ ফেরত, অন্য POP-এ পাঠানো যাবে
4. ✅ **Left Clients** tab → admin bulk বা single delete করতে পারবে; prepaid POP হলে refund auto

