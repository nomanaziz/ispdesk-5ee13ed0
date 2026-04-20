

## লক্ষ্য
Tariff system-কে সম্পূর্ণ পুনর্গঠন: এক tariff-এ **multiple packages**, **multiple servers/profiles**, এবং buy/sell price tracking। Server change করলে user-দের auto-sync।

## নতুন Data Model

বর্তমানে `reseller_tariffs`-এ এক row = এক package + এক server। নতুন structure:

**`reseller_tariffs`** (parent — শুধু tariff নাম + assigned POPs দেখায়):
- `id`, `name`, `tariff_type` ('custom' | 'date_to_date'), `status`, `created_at`, `created_by`
- পুরাতন `package_id`, `selling_rate`, `mikrotik_server_id`, `mikrotik_profile`, `protocol_type`, `activation_days`, `min_activation_days` কলাম **deprecated** কিন্তু backward-compat-এর জন্য রাখব (nullable)।

**`reseller_tariff_packages`** (নতুন child table — এক tariff-এ বহু package):
- `id`, `tariff_id` (FK), `package_id` (FK isp_packages)
- `mikrotik_server_id` (FK mikrotik_devices), `mikrotik_profile` (text)
- `protocol_type` ('PPPoE' | 'IPoE' | 'Static')
- `buy_rate` (numeric — base/buy price), `selling_rate` (numeric)
- `validity_days` (int, default 30), `min_activation_days` (int, default 1)
- `created_at`, `updated_at`
- Unique: (`tariff_id`, `package_id`, `mikrotik_server_id`) — same package different server allowed।

**Migration ও sync trigger**: পুরাতন row থেকে data move করে নতুন child table-এ এক row তৈরি করব (data preserved)।

## UI পুনর্গঠন (`Tariff.tsx` rewrite + Edit Dialog)

uploaded screenshot-এর মতো dialog:
- **Tariff Type**: Custom / Date To Date (radio)
- **Tariff Name**: text + Edit button
- **Package Add section** (form fields):
  - Package Name (Select from `isp_packages`)
  - Buy Rate (auto-fill from package.price, editable)
  - Selling Rate (input)
  - Validity Days (default 30)
  - Minimum Activation Days (default 1)
  - Server Name (Select from `mikrotik_devices`)
  - Protocol (PPPoE/IPoE/Static)
  - MikroTik Profile (auto-load via `fetch-mikrotik-profiles`)
  - **[Add Package] button** — adds row to inner table
- **Inner table**: Sr, Package, Server, Protocol, Profile, Buy, Sell, Validity, Min Days, Action (edit/delete)
- **Cancel / Update** buttons

### Tariff List Table (main page)
Screenshot-এর কলাম অনুযায়ী:
| S/N | Tariff Name | Assigned POPs | Packages (comma list) | Servers (comma list) | Profiles (comma list) | CreatedOn | CreatedBy | Action |

- **Assigned POPs**: `branch_managers` যাদের `tariff_id` = এই tariff
- **Packages**: child table থেকে aggregated names
- **Action**: Sync (refresh icon), Toggle status, Edit, View, Delete

## Server Change → Auto-Sync

যখন user কোনো `reseller_tariff_packages` row-এর `mikrotik_server_id` বা `mikrotik_profile` change করে save করে:
1. সেই tariff-এর সব assigned POP-এর সব client খুঁজে বের করব যাদের package = এই row-এর `package_id`।
2. প্রতিটা client-এর জন্য নতুন server-এ PPP user create + পুরানো server থেকে remove।
3. এটা **edge function** `sync-tariff-package-change`-এর মাধ্যমে করব (existing `create-mikrotik-ppp` ও `manage-mikrotik-ppp` function reuse)।
4. UI-তে confirmation dialog: "X client নতুন server-এ migrate হবে — চালিয়ে যান?"

## Files

### Migration
- ➕ `reseller_tariff_packages` table create + RLS + indexes
- ➕ Data migration: existing `reseller_tariffs` rows → child rows
- ➕ `created_by uuid` column-এ যোগ `reseller_tariffs`-এ
- ➕ `tariff_type text default 'custom'` যোগ

### Code
- ✏️ `src/pages/dashboard/branches/Tariff.tsx` — সম্পূর্ণ rewrite (multi-package dialog + new list)
- ➕ `supabase/functions/sync-tariff-package-change/index.ts` — server migration handler
- ✏️ `src/pages/dashboard/branches/Managers.tsx` — assigned POPs display ঠিক রাখা (no breaking)
- ✏️ `src/pages/dashboard/branches/PopProfile.tsx` — multi-package display
- ✏️ `src/pages/dashboard/branches/PgwPayments.tsx` — selling_rate পরিবর্তে first package-এর rate বা mapping logic update
- ✏️ `src/integrations/supabase/types.ts` — auto-regenerated

## কী **হবে না**
- পুরাতন `reseller_tariffs` row delete হবে না — শুধু expanded
- `branch_managers.tariff_id` foreign key অপরিবর্তিত (এক POP-এ এক tariff, কিন্তু সেই tariff-এ multiple packages)
- AddManager flow অপরিবর্তিত

