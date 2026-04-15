

## Plan: Update MikroTik Version Options to 3

The reference image shows 3 version options in the dropdown:
1. **Version 6.43 or older**
2. **Version greater 6.43 or older 7.0**
3. **Newer than version 7.0**

Currently the code only has `v3` and `v2`.

### Changes — `src/pages/dashboard/mikrotik/Servers.tsx`

1. Update the `defaultForm` version default to match the new naming
2. Update the version `<Select>` in the dialog to show 3 options:
   - `6.43_or_older` → "Version 6.43 or older"
   - `gt6.43_lt7.0` → "Version greater 6.43 or older 7.0"
   - `7.0_or_newer` → "Newer than version 7.0"
3. Update the version `<Badge>` display in the table to show readable labels

### Files
- 1 file edited: `src/pages/dashboard/mikrotik/Servers.tsx`

