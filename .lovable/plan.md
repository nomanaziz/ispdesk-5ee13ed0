

## MikroTik → POP Transfer Flow + Global User Search

### সমস্যা

বর্তমানে `Import.tsx`-এ "MAC রিসেলারে এক্সপোর্ট" button click করলে `mikrotik_clients.exported = true` set হয়ে যাচ্ছে — কিন্তু কোথায় গেল, কোন POP-এ গেল কিছুই track হয় না, দেখা যায় না। User চান:

1. Export না, **POP-এ Transfer** — কোন POP, কোন MikroTik-এ যাবে select করতে হবে
2. Transfer-এর পর POP (reseller) তার own panel থেকে শুধু **তার assigned MikroTik দেখতে পারবে** (add করতে পারবে না)
3. Global search — যে কোনো PPPoE username/ID দিলে কোন POP-এর under-এ আছে বের হবে

### বর্তমান অবস্থা (Recon)

- `mikrotik_clients` table-এ `exported`, `exported_to` আছে কিন্তু `pop_id`, `target_mikrotik_id` নেই
- POP table আছে (`network_pops` বা `branches` — verify করব)
- Reseller portal (`/reseller/*`) আছে — কিন্তু MikroTik view page নেই
- Global search component (`GlobalClientSearch.tsx`) আছে — শুধু `clients` table search করে, `mikrotik_clients` cover করে না

### Plan

#### Phase A — Recon (এই plan-এ আগেই করব, approval দরকার নাই)

আমি check করব:
- POP কোন table-এ (`network_pops`, `branches`, না অন্য কিছু)
- POP-এ কয়টা MikroTik assign করা যায় (`mikrotik_devices.pop_id` / `branch_id` আছে কিনা)
- Reseller user POP-এর সাথে কীভাবে link (`bw_reseller_users.pop_id` ?)

#### Phase B — Database Migration

```sql
ALTER TABLE mikrotik_clients
  ADD COLUMN transferred_to_pop_id uuid REFERENCES <pop_table>(id),
  ADD COLUMN transferred_to_mikrotik_id uuid REFERENCES mikrotik_devices(id),
  ADD COLUMN transferred_at timestamptz,
  ADD COLUMN transferred_by uuid;

-- Index for global search
CREATE INDEX idx_mikrotik_clients_name ON mikrotik_clients(lower(name));
CREATE INDEX idx_mikrotik_clients_caller ON mikrotik_clients(caller_id);
```

`exported_to` field-এ `"mac_reseller"` placeholder বাদ — actual POP id store হবে।

#### Phase C — Replace "MAC Reseller Export" with "Transfer to POP"

`src/pages/dashboard/mikrotik/Import.tsx`-এ:
- "MAC রিসেলারে এক্সপোর্ট" button → **"POP-এ ট্রান্সফার"**
- নতুন `TransferToPopDialog.tsx` component:
  - Step 1: POP dropdown (multiple POP available)
  - Step 2: Target MikroTik dropdown (filtered by selected POP-এর MikroTik devices)
  - Confirm → bulk update `mikrotik_clients` rows: `transferred_to_pop_id`, `transferred_to_mikrotik_id`, `mikrotik_id` (move to new server), `transferred_at`, `transferred_by`
- Filter chip: "Pending Transfer" / "Transferred to POP" toggle
- Transferred row-এ POP name + MikroTik name show

#### Phase D — Reseller Portal: MikroTik Users View

নতুন page `src/pages/reseller/ResellerMikrotikUsers.tsx`:
- Login করা reseller-এর POP-এ assigned MikroTik devices show
- প্রতিটা MikroTik-এর নিচে transferred PPPoE users list (read-only sync থেকে)
- Actions: Enable/Disable PPP, Reset password, Change profile (via existing `manage-mikrotik-ppp` edge function — already exists)
- Reseller **MikroTik add করতে পারবে না** — শুধু admin assign করবে
- Sidebar-এ link: `ResellerLayout.tsx`-এ "MikroTik Users" menu add

`ResellerProtectedRoute` already restricts — শুধু route + page add।

#### Phase E — Global User Search Enhancement

`GlobalClientSearch.tsx` extend:
- `clients` table-এর সাথে `mikrotik_clients` table-ও search করবে
- Result-এ show: `username | POP name | MikroTik server | source (admin/reseller)`
- Click → relevant POP/MikroTik view-এ navigate

Search query parallel করব দুই table-এ, merged result।

### Files

| File | Action |
|------|--------|
| `supabase/migrations/...` | NEW — alter mikrotik_clients + indexes |
| `src/components/mikrotik/TransferToPopDialog.tsx` | NEW |
| `src/pages/dashboard/mikrotik/Import.tsx` | Edit — replace export button with Transfer dialog, show transferred POP/MT |
| `src/pages/reseller/ResellerMikrotikUsers.tsx` | NEW |
| `src/components/ResellerLayout.tsx` | Edit — add menu item |
| `src/App.tsx` | Edit — add reseller route |
| `src/components/GlobalClientSearch.tsx` | Edit — also search mikrotik_clients |

### Phasing Decision

সবগুলো এক loop-এ করব — interconnected এবং user clearly একটা end-to-end flow চাইছেন (admin transfer → reseller সেটা দেখবে → search করে বের করতে পারবে)।

### Questions before execution

POP table পরিচয় confirm দরকার:

