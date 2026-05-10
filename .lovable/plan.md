## Goal
Add a "Bulk Set" toolbar to `/dashboard/mikrotik/bulk-import` so the user can apply common values (Zone, Connection Type, Protocol Type, Package, Client Type, Status, Bill Month, Join Date, Expiry Date) to many rows at once instead of editing them one by one.

## How it works

1. **Selection-driven** — A checkbox column already exists per row. The bulk toolbar applies its values **only to selected rows**. If nothing is selected, a helper note says "Select rows first" and Apply is disabled. A "Select all visible" shortcut sits next to it.

2. **Bulk toolbar UI** — A new collapsible card titled "একসাথে সেট করুন (Bulk Set)" placed right above the import table. Inside it, a responsive grid of fields:
   - Zone (Select, from `zones`)
   - Conn.Type (Select, from `connection_types_config`)
   - Prot.Type (Select, from `protocol_types`)
   - Package (Select, from `isp_packages` — when applied, also auto-fills `M.Bill` from package price)
   - C.Type (Select: Home / Corporate)
   - B.Status (Select: Active / Inactive / Pending)
   - Bill.Month (month input → `MM-YYYY`)
   - Join.Date (date input → `DD-MM-YYYY`)
   - Exp.Date (number 1–31, day-of-month)

   Each field is optional; only fields the user actually filled get applied. Two buttons: **Apply to Selected** and **Clear** (clears the bulk form, not the table).

3. **Behavior rules**
   - Applying overwrites the value in every selected row (even if that row already had one), so the user can correct mistakes in bulk too.
   - Applying Package also sets `M.Bill` for those rows (matching current single-row behavior).
   - After apply: success toast like "১২ টি রো আপডেট হয়েছে" and the bulk form stays filled (user can apply again to a different selection).

4. **No DB or API changes** — Pure frontend. Uses the same option lists already fetched on the page.

## Technical Details

- **File touched:** `src/pages/dashboard/mikrotik/BulkImport.tsx` only.
- Add `bulkValues` state object (one optional value per field).
- Add `applyBulk()` that maps over `rows`, and for `selected` rows merges only the keys present in `bulkValues`.
- Reuse existing `<Select>` option arrays (`zones`, `connectionTypes`, `protocolTypes`, `packages`).
- Layout: `Card` with a `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3` body, action row underneath.
- No changes to validation, import payload, or DB schema.

## Out of Scope
- Bulk-editing personal fields (Name / Mobile / Address / NID) — those are intentionally per-row.
- Saving bulk presets for reuse across sessions.
