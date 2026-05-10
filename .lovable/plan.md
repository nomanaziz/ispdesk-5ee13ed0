## Goal
Make BulkImport (`/dashboard/mikrotik/import`) auto-fill all derivable fields when MikroTik users are loaded, so the user only has to fill truly missing personal info (Name, Mobile, Address, etc.).

## Auto-fill Rules

When MikroTik users load (or refresh), each row will populate as follows — pulling from existing config tables (`zones`, `connection_types`, `protocol_types`, `isp_packages`) and system settings.

| Field | Source / Logic |
|---|---|
| **C.Code** | MikroTik username (current behavior) |
| **UserName / Password** | MikroTik (current) |
| **Server** | MikroTik device name (current) |
| **Profile** | MikroTik profile (current) |
| **R.Address** | MikroTik remote_address (current) |
| **Zone** | First active zone from `zones` table (default). User can edit. |
| **Conn.Type** | First active row from `connection_types` (e.g. "UTP" / "Fiber"). |
| **Prot.Type** | Match MikroTik `service` against `protocol_types`. If MikroTik says `pppoe` → "PPPoE". If `any`/empty → fallback to first active protocol_type. |
| **C.Type** | Default `"Home"` (hardcoded list Home/Corporate). |
| **Package** | Match by `mikrotik_profile === profile` (current). |
| **M.Bill** | From matched package `price`. If no match → 0 (not 500). |
| **B.Status** | `"Active"` (current). |
| **Bill.Month** | Current `MM-YYYY` (e.g. `05-2026`). |
| **Join.Date** | Today (`DD-MM-YYYY`) — current is ISO; switch to `DD-MM-YYYY` to match sample. |
| **Exp.Date** | Day-of-month number based on `billing_cycle_config` (`monthly_first` → `1`, else day of join). Stored as a 2-digit day like `"10"`, matching the sample data. |

## UI Changes

1. **Render Zone, Conn.Type, Prot.Type, C.Type, Package, B.Status as `<Select>` dropdowns** instead of free-text Input. Options come from the corresponding config tables / fixed lists. This guarantees only valid values reach the import step.
2. **Mandatory vs Optional column headers** — append `(Opt.)` to optional columns: `Email`, `NationalId`, `DateOfBirth`, `FatherName`, `MotherName`, `Occupation`. Mandatory ones get a small red `*`.
3. **Visual highlight** — auto-filled cells get a subtle muted background so the user can quickly spot which cells still need manual input (Name, Mobile, Address).
4. **Date format** — display dates as `DD-MM-YYYY` to match the user's sample.

## Validation Before Import

Before allowing "সব ইমপোর্ট করুন":
- Each row must have: `Name`, `Mobile`, `Address`, `Zone`, `Conn.Type`, `Prot.Type`, `Package`, `M.Bill > 0`, `Join.Date`, `Exp.Date`.
- Rows missing any mandatory field show an inline red badge; import button shows count of invalid rows.

## Data Fetched (additions)

Add three queries to `BulkImport.tsx`:
- `connection_types` (where status='active')
- `protocol_types` (where status='active')
- `system_settings` row `billing_cycle_config` (to compute Exp.Date day)

## Files

- `src/pages/dashboard/mikrotik/BulkImport.tsx` — only file touched.
- No DB schema changes, no edge function changes.

## Out of Scope

- Adding a new `client_types` config table (Home/Corporate stays as a fixed two-option list — confirm if you want it driven by a DB table instead).
- Changing the actual `clients` insert payload shape (already accepts these fields).
