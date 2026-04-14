

## Plan: Packages Page Improvements

### Changes to `src/pages/dashboard/config/Packages.tsx`

**1. Add package_type filter tabs/buttons above the table**
- Add a `typeFilter` state (default: `"all"`)
- Render filter buttons: "সব", "Home", "Corporate", "Business", "Personal", "Dedicated"
- Apply filter before search in the `filtered` variable

**2. Merge bandwidth into single field**
- Replace separate download/upload inputs with one "ব্যান্ডউইথ (Mbps)" input
- When user enters a value, both `bandwidth_down` and `bandwidth_up` get the same value
- Table column shows single value (e.g. "10 Mbps") instead of "10 / 10"

**3. Protocol dropdown from `protocol_types` table**
- Add a `useQuery` to fetch active records from `protocol_types` table
- Replace the free-text protocol `<Input>` with a `<Select>` dropdown populated from the query
- Display protocol type names (Static, Hotspot, PPPoE) as select options

### No database changes needed
All required tables and columns already exist.

