

## Plan: Build All Configuration Pages + Import District/Upazila Data

### Part 1: Import All Districts & Upazilas from Excel

The uploaded Excel file contains all Bangladesh districts and upazilas. Currently only 4 demo districts and 8 upazilas exist. We will:

1. **Parse the Excel file** using a Python script to extract all district and upazila names
2. **Delete existing demo data** (4 districts, 8 upazilas) and **insert the full dataset** (~64 districts, ~500 upazilas) via the Supabase insert tool
3. All inserted with `status: 'active'` by default

### Part 2: Create `connection_types` Table

The `connection_types` table does not exist yet. Create via migration:
- `id` (uuid), `name` (text), `status` (text, default 'active'), `created_at` (timestamptz)

### Part 3: Build a Reusable Config CRUD Component

Create a shared `ConfigCrudPage` component that handles all config tables with a consistent UI pattern:

**Features per page:**
- Search/filter bar
- Data table with status toggle (active/inactive switch)
- **Single Add** — Dialog with form fields
- **Single Edit** — Inline edit or dialog
- **Single Delete** — Confirm dialog
- **Bulk Actions** — Select multiple rows via checkboxes, then bulk delete, bulk activate, bulk deactivate
- Toast notifications for all actions

### Part 4: Build Each Configuration Page

| Page | Table | Extra Fields | Special Features |
|---|---|---|---|
| **Districts** | `districts` | name, code | On/off toggle; when district OFF → all its upazilas auto-deactivate; coverage area hides |
| **Upazilas** | `upazilas` | name, code, district_id (dropdown) | Filtered by district; parent district status cascades |
| **Zones** | `zones` | name, code | Standard CRUD |
| **Sub Zones** | `sub_zones` | name, code, zone_id (dropdown) | Filtered by parent zone |
| **Boxes** | `boxes` | name, code, zone_id, sub_zone_id (cascading dropdowns) | Cascading location selects |
| **Connection Types** | `connection_types` | name | Standard CRUD |
| **Client Types** | `client_types` | name | Standard CRUD |
| **Protocol Types** | `protocol_types` | name | Standard CRUD |
| **Billing Statuses** | `billing_statuses` | name, color | Color picker for status badge |
| **Service Types** | `service_types` | name, description | Standard CRUD |
| **Packages** | `isp_packages` | Enhanced existing page | Add edit dialog, delete, bulk actions |

### District On/Off Cascade Logic

When a district is toggled OFF:
- District `status` → `'inactive'`
- All upazilas with that `district_id` → `status: 'inactive'` automatically (via frontend mutation)
- Coverage page filters by `status = 'active'`, so these areas auto-hide

When toggled back ON:
- District reactivates, upazilas under it also reactivate

### Files to Create/Edit

| File | Action |
|---|---|
| `src/components/config/ConfigCrudPage.tsx` | **New** — Reusable CRUD component with table, dialogs, bulk actions |
| `src/components/config/BulkActionBar.tsx` | **New** — Bulk select toolbar (delete, activate, deactivate) |
| `src/components/config/AddEditDialog.tsx` | **New** — Reusable add/edit dialog |
| `src/pages/dashboard/config/Districts.tsx` | **Rewrite** — Full CRUD + cascade toggle |
| `src/pages/dashboard/config/Upazilas.tsx` | **Rewrite** — CRUD with district filter |
| `src/pages/dashboard/config/Zones.tsx` | **Rewrite** — Full CRUD |
| `src/pages/dashboard/config/SubZones.tsx` | **Rewrite** — CRUD with zone filter |
| `src/pages/dashboard/config/Boxes.tsx` | **Rewrite** — CRUD with cascading zone/subzone |
| `src/pages/dashboard/config/ConnectionTypes.tsx` | **Rewrite** — Full CRUD |
| `src/pages/dashboard/config/ClientTypes.tsx` | **Rewrite** — Full CRUD |
| `src/pages/dashboard/config/ProtocolTypes.tsx` | **Rewrite** — Full CRUD |
| `src/pages/dashboard/config/BillingStatuses.tsx` | **Rewrite** — CRUD + color picker |
| `src/pages/dashboard/config/ServiceTypes.tsx` | **Rewrite** — Full CRUD |
| `src/pages/dashboard/config/Packages.tsx` | **Edit** — Add edit, delete, bulk actions |

### Migration Needed
- Create `connection_types` table
- Insert all districts and upazilas from Excel (after deleting demo data)

### Technical Notes
- All pages use `@tanstack/react-query` for data fetching
- Supabase client for all CRUD operations
- Bulk actions use `Promise.all` with individual Supabase calls
- Checkbox-based row selection for bulk operations
- Status toggle uses Switch component (same pattern as Packages page)

