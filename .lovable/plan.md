

## Billing List — সম্পূর্ণ ফিল্টার, বাল্ক অ্যাকশন এবং Server Transfer

Screenshot অনুযায়ী BillingList পেজে সব ফিল্টার, বাল্ক অ্যাকশন বাটন, এবং MikroTik server-to-server transfer যোগ করা হবে।

---

### 1. সম্পূর্ণ ফিল্টার প্যানেল (Collapsible Hide/Show)

Screenshot-এ যা যা ফিল্টার আছে সব যোগ হবে, "Hide" বাটন দিয়ে toggle করা যাবে:

**Row 1:** Server, Protocol Type, Profiles, Zone, Sub Zone, Box
**Row 2:** Package, Billing Status, Payment Status, MikroTik Status, Connection Type, Client Type
**Row 3:** From Expire Date, To Expire Date, From Effective Date, To Effective Date, From Non-Effective Date, To Non-Effective Date
**Row 4:** Custom Status, From Date, To Date

প্রতিটি dropdown-এর data DB থেকে `useQuery` দিয়ে আনবে:
- `mikrotik_devices` → Server
- `protocol_types` → Protocol Type
- `clients.profile` distinct → Profiles
- `zones` → Zone
- `sub_zones` → Sub Zone
- `boxes` → Box
- `isp_packages` → Package
- `billing_statuses` → Billing Status
- `client_types` → Client Type

সব filter `useMemo`-তে combined apply হবে।

---

### 2. সম্পূর্ণ বাল্ক অ্যাকশন বাটন

Screenshot অনুযায়ী দুই সারিতে action buttons:

**Row 1:** Generate Excel, Generate PDF, Sync Clients & Servers, Disable Selected Clients, Bulk Status Change, Bulk Zone Change, Bulk District Change, Bulk Thana Change, Enable Selected Clients, Download Invoice

**Row 2:** SMS Selected Clients, Email Selected Clients, Bulk Billing Date Extend, **Migrate to Another Server**, Bulk Update to VIP, Bulk Remove VIP, Bulk Profile Change

Table-এ checkbox column যোগ হবে (header-এ select all, প্রতি row-তে individual select)। `selectedIds` state দিয়ে manage হবে।

---

### 3. MikroTik Server-to-Server Transfer (Migrate)

এটা সবচেয়ে important feature। একটা dedicated `ServerMigrationDialog` component তৈরি হবে:

**Flow:**
1. User একাধিক client select করে "Migrate to Another Server" বাটনে click করবে
2. Dialog-এ "Target Server" dropdown দেখাবে (mikrotik_devices থেকে)
3. "Validate & Transfer" বাটনে click করলে:
   - প্রতিটি selected client-এর **profile** নিয়ে target server-এ check করবে সেই profile আছে কি না
   - Profile না থাকলে: `"Profile '50Mb' missing on target server 'ServerB'"` error message দেখাবে, transfer হবে না
   - সব profile match করলে:
     a. Source server থেকে PPP secret remove করবে (`manage-mikrotik-ppp` action: remove)
     b. Target server-এ PPP secret create করবে (`create-mikrotik-ppp`) — same username, password, profile, remote_address
     c. Client-এর `mikrotik_id` এবং `server_name` DB-তে update করবে
     d. `system_logs`-এ log রাখবে

**Edge Function Update:**
- `manage-mikrotik-ppp`-এ নতুন action `"list-profiles"` যোগ হবে — `/ppp/profile/print` চালিয়ে target server-এর available profiles return করবে
- Frontend validation: selected clients-এর profiles target server-এর profile list-এ আছে কি না check করবে

---

### 4. Summary Cards আপডেট

Screenshot অনুযায়ী "Generated Bill" এবং "Received Bill" সহ ৭টি summary card — বর্তমান ১২টি card থেকে screenshot layout-এ adjust করা হবে।

---

### যে ফাইলগুলো তৈরি/পরিবর্তন হবে

| File | Change |
|------|--------|
| `src/pages/dashboard/billing/BillingList.tsx` | সব filter, checkbox selection, bulk action buttons |
| `src/components/billing/BillingFilterPanel.tsx` | **নতুন** — collapsible filter panel component |
| `src/components/billing/BulkActionButtons.tsx` | **নতুন** — bulk action buttons row |
| `src/components/billing/ServerMigrationDialog.tsx` | **নতুন** — server transfer dialog with profile validation |
| `src/components/billing/BulkStatusChangeDialog.tsx` | **নতুন** — bulk status change dialog |
| `src/components/billing/BulkZoneChangeDialog.tsx` | **নতুন** — bulk zone change dialog |
| `src/components/billing/BulkProfileChangeDialog.tsx` | **নতুন** — bulk profile change dialog |
| `supabase/functions/manage-mikrotik-ppp/index.ts` | `list-profiles` action যোগ |

### DB Migration
- কোনো নতুন table লাগবে না। শুধু edge function update।

