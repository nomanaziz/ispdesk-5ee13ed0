

## Plan: Fix MikroTik Import Flow

### Problem 1: "Export to Client List" doesn't prefill MikroTik fields
The Import page sends `username`, `password`, `server_name`, `mikrotik_id`, `profile`, `mac_address` via `navigate()` state, but `AddClient.tsx` only reads `name`, `contact`, `email`, `address`, `zone_id`, `connection_type`, `package_id`, `monthly_bill`, `customer_type` in its `useEffect`. The MikroTik-specific fields are ignored.

**Fix in `AddClient.tsx`**: Add these fields to the prefill `useEffect`:
- `username`, `password`, `profile`, `mikrotik_id`, `remote_address`, `server_name`, `mac_address`
- Also auto-trigger `fetch-mikrotik-profiles` when `mikrotik_id` is prefilled so the profile dropdown populates

### Problem 2: Bulk Import should auto-load unmatched MikroTik users
Currently BulkImport only works via Excel upload. It should instead:

**Redesign `BulkImport.tsx`**:
1. On page load, query `mikrotik_clients` where `exported = false` and filter out any whose `name` (username) already exists in `clients.username`
2. Display these unmatched users in the editable table with auto-populated fields:
   - `C.Code` = MikroTik username
   - `UserName` = MikroTik username  
   - `Password` = MikroTik password
   - `Server` = MikroTik device name
   - `Profile` = MikroTik profile
   - `R.Address` = MikroTik remote_address
   - `Prot.Type` = service (pppoe/dhcp)
   - `M.Bill` = auto-fill from matching `isp_packages` by profile (500 default)
   - `Package` = matched package name from profile
3. Keep the Excel upload as an alternative option
4. After successful import, mark `mikrotik_clients` records as `exported = true`

### Files to Change

| File | Change |
|------|--------|
| `src/pages/dashboard/clients/AddClient.tsx` | Add MikroTik fields (`username`, `password`, `profile`, `mikrotik_id`, `remote_address`) to prefill useEffect; auto-fetch profiles when mikrotik_id prefilled |
| `src/pages/dashboard/mikrotik/BulkImport.tsx` | Auto-load unmatched MikroTik users on mount, pre-populate fields, mark exported after import |

