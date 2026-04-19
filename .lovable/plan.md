

User wants a **Customer Asset Assignment** system where company assets (ONU, router, etc.) given to any party (home client, POP/MAC reseller, BW customer, vendor) are tracked, visible to that party in their portal, and auto-restocked when returned.

Let me explore current state first.
<lov-tool-use id="toolu_vrtx_012tT1HEZeB7LwZhkeJoWa8b" name="code--search_files" integration-id="code" data="{\"query\": \"network_node_items|inventory_items\", \"include_patterns\": \"src/**/*.tsx,src/**/*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ua24q3K53VVitL5nk1xQYq" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/clients/AddClient.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LVW4JNEwPNJHXwTkh2xdyq" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%asset%' OR table_name LIKE '%assign%' OR table_name LIKE 'inventory%' OR table_name='customers' OR table_name='bw_customers' OR table_name='resellers' OR table_name='vendors' OR table_name='pop_customers') ORDER BY table_name\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WuVvAXUjFwaEzy1J2ZdyEH" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%asset%' OR table_name LIKE '%assign%' OR table_name LIKE 'inventory%' OR table_name LIKE 'stock%' OR table_name='customers' OR table_name='bw_customers' OR table_name='resellers' OR table_name='vendors' OR table_name='pop_customers' OR table_name='network_node_items') ORDER BY table_name\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Gqa5Nc1aCzAR5va35bjh6L" name="code--search_files" integration-id="code" data="{\"query\": \"network_node_items\", \"include_patterns\": \"src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BeCcqiCb72djwQJPzL3iGi" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('assets','customers','vendors','inventory_items','stock_movements','network_node_items') ORDER BY table_name, ordinal_position\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Vw2bWKctidV8j454iPjbvb" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%bw%customer%' OR table_name LIKE '%reseller%' OR table_name LIKE 'bw_%' ) ORDER BY table_name\"}">
</lov-tool-use>
I have enough context. Let me check clients table & portal-data function structure.
<lov-tool-use id="toolu_vrtx_01Tt4ZEZUZt5e7KQZTFNeVch" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name='clients' OR table_name LIKE '%pop_client%' OR table_name LIKE '%mac%')\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016UnDEVQc94GrEhgxnAhGao" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"supabase/functions/portal-data/index.ts\", \"query\": \"action ===\"}">
</lov-tool-use>
<lov-plan>

## Goal
Track ISP company assets (ONU, router, etc.) given to clients/resellers/vendors. When assigned → stock decreases. When returned/client leaves → stock restored. Portals (home client, BW customer, reseller) show their assigned assets.

## Data Model

New table **`asset_assignments`** (single source of truth, polymorphic recipient):

```
id uuid pk
inventory_item_id uuid → inventory_items
quantity numeric default 1
serial_no text                    -- ONU serial / router MAC etc.
recipient_type text               -- 'client' | 'bw_customer' | 'reseller' | 'vendor' | 'other'
recipient_id uuid                 -- FK depending on type (no hard FK, validated in code)
recipient_name text               -- snapshot for display
notes text
status text default 'active'      -- 'active' | 'returned'
assigned_at timestamptz default now()
assigned_by uuid
returned_at timestamptz
returned_by uuid
created_at timestamptz default now()
```

RLS: admins full; portal users SELECT own rows via edge function (service role).

## Stock Sync Logic
- **On INSERT** (status='active'): decrement `inventory_items.quantity` by qty + insert `stock_movements` (type='out').
- **On UPDATE** to status='returned': increment `inventory_items.quantity` by qty + insert `stock_movements` (type='in').
- **On DELETE**: if was active, restore stock + log movement.

Implemented via Postgres trigger `sync_asset_stock()` for atomicity.

## UI Changes

### 1. New admin page: `src/pages/dashboard/assets/AssetAssignments.tsx`
Route `/dashboard/assets/assignments`. Features:
- List with filters: recipient type, item, status (active/returned), search.
- "Assign Asset" dialog: pick item (only items with stock > 0) → recipient type → recipient picker (loads clients/bw_customers/resellers/vendors based on type) → qty → serial → notes.
- "Mark Returned" action per row → triggers stock restore.
- Add to sidebar under Assets module.

### 2. Add Client flow (`src/pages/dashboard/clients/AddClient.tsx`)
Add optional **"Assigned Equipment"** section at end of form (item + serial + qty rows, repeatable). On client save success → bulk-insert into `asset_assignments` with `recipient_type='client'`, `recipient_id=newClientId`. Optional, can skip.

### 3. Client leave/inactive flow
When a client is moved to "left" status (`src/pages/dashboard/clients/LeftClients.tsx` or wherever status changes to inactive/left): auto-mark their active `asset_assignments` as `returned`. Show confirmation dialog listing items to be restocked.

### 4. Portal views (read-only "My Assets")
- **Home client portal**: new page `src/pages/portal/PortalMyAssets.tsx` + sidebar entry. Calls portal-data edge function action `my_assets`.
- **BW customer portal**: same page reused; portal-data filters by `recipient_type='bw_customer'`.
- **Reseller portal**: new page `src/pages/reseller/ResellerMyAssets.tsx` + nav entry.
- All show: item name, serial, qty, assigned date, status. No edit.

### 5. Edge function update (`supabase/functions/portal-data/index.ts`)
Add `my_assets` action that returns assignments where `recipient_id` matches the JWT subject and `recipient_type` matches user type.

## Files
**Migration**: create `asset_assignments` + trigger + RLS.
**New**: `src/pages/dashboard/assets/AssetAssignments.tsx`, `src/components/assets/AssignAssetDialog.tsx`, `src/pages/portal/PortalMyAssets.tsx`, `src/pages/reseller/ResellerMyAssets.tsx`.
**Edit**: `src/App.tsx` (routes), `src/components/AppSidebar.tsx` (Assets menu), `src/pages/dashboard/clients/AddClient.tsx` (equipment section), `src/pages/dashboard/clients/LeftClients.tsx` or client status handler (auto-return), `src/components/PortalLayout.tsx` (nav), `src/components/ResellerLayout.tsx` (nav), `supabase/functions/portal-data/index.ts` (`my_assets` action).

## Notes
- Existing `network_node_items` (POP-level inventory) stays unchanged — different concept.
- Existing `stock_movements` table reused for audit.
- Vendors picker reads from `vendors` table; "other" recipient type allows free-text name when no FK.

