## Issues to Fix

### 1. Bug — "invalid input syntax for type date: '10'"
`clients.expire_date` is a Postgres `date` column, but the import is sending the **day-of-month** string (e.g. `"10"`). 

**Fix:** Convert `Exp.Date` (day 1–31) plus `Bill.Month` (`MM-YYYY`) into a real `YYYY-MM-DD` date before insert. If the day exceeds the month length (e.g. day 31 in February), fall back to the month's last day. If `Bill.Month` is missing, use the current month.

```text
Bill.Month = "05-2026", Exp.Date = "10"  →  expire_date = 2026-05-10
Bill.Month = "02-2026", Exp.Date = "31"  →  expire_date = 2026-02-28
```

This is a one-line change inside `importAll()` in `BulkImport.tsx`.

### 2. Original snapshot + reset on clear
Currently the bulk toolbar's "Clear Form" only clears the input fields — it does not undo what was applied to rows. Per the user's request, after editing rows in bulk, the user should be able to **select rows and "Reset to Original"** to restore the values that were auto-filled when the row was first loaded from MikroTik.

**Implementation:**
- When `loadUnmatchedUsers()` builds each row, also stash an immutable `_original` snapshot of every cell value (including `_autoFilled` flags).
- Add a new button in the bulk toolbar: **"Reset Selected to Original"** (icon: `Undo2`).
- Clicking it restores selected rows' fields back to their `_original` snapshot, preserves their `_selected` state, and shows toast `"৫ টি রো রিসেট হয়েছে"`.
- Also keep the existing `Clear Form` button (clears the bulk input fields only — current behaviour).

This solves the "ভুল entry দিতে পারে, তখন সব clear করার দরকার লাগতে পারে" need without losing the loaded MikroTik data.

### 3. Global Client Code uniqueness check
`clients.client_id` already has a **global unique index** (`clients_client_id_key`), so the database will reject duplicates. But currently the user only finds out at insert time with a cryptic error. We should validate **before** import and tell them exactly which existing client owns the conflicting code.

**Implementation in `BulkImport.tsx`:**

- **On row load (and on every C.Code edit, debounced),** query:
  ```sql
  SELECT client_id, name, branch_id FROM clients WHERE client_id IN (...)
  ```
  Mark each row's `_codeConflict` with `{ existingName, branchId }` if a match is found.

- **Visual indicator in the C.Code cell:**
  - Red border + small `AlertCircle` icon next to the input.
  - Tooltip / hover: `"এই কোড ইতোমধ্যে ব্যবহৃত: <existingName> (<branch>)"`.

- **Row-level badge:** add to the existing destructive-row treatment so conflicting rows are highlighted along with rows missing mandatory fields.

- **Import button:** disabled when `conflictCount > 0`. Show a badge: `"X টি কোড ইতোমধ্যে ব্যবহৃত — পরিবর্তন করুন"`.

- **Header summary:** above the table — total rows, invalid rows, **conflicting code count**.

The actual uniqueness is enforced at DB level (across admin / reseller / bandwidth reseller — all live in the same `clients` table), so this check covers all three scopes the user mentioned.

## Files Touched
- `src/pages/dashboard/mikrotik/BulkImport.tsx` — only file.

No schema changes (the unique index already exists; `expire_date` stays as `date`).

## Out of Scope
- Auto-generating a fresh client code when conflict is detected (user explicitly wants to **decide** which side to change).
- Changing the bulk-set toolbar layout — only adding the "Reset to Original" button.
