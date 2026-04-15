

## Plan: New Client Request Workflow

### Workflow States
```text
Pending → Contacted → Processing (employees assigned) → Phy. Done → Completed (convert to client)
```

1. **Pending**: New request arrives, status = "Pending"
2. **Contacted**: Admin confirms contact → status = "Contacted" (or "Already Contacted" if client called)
3. **Assign Employees**: Admin assigns 1+ employees via a dialog. Once assigned → status = "Processing", physical_connectivity = "In Progress"
4. **Physical Done**: Field employees mark physical_connectivity = "Done"
5. **Completed**: Admin clicks "Convert to Client" → navigates to AddClient with prefilled data, sets setup_status = "Completed"

### Database Changes (1 migration)

**New table: `client_request_assignments`**
- `id` uuid PK
- `request_id` uuid FK → client_requests
- `employee_id` uuid FK → employees
- `assigned_at` timestamptz default now()

This replaces the single `assigned_to` column for multi-employee assignment.

### UI Changes — `NewRequest.tsx`

**Status column**: Show workflow badge (Pending / Contacted / Processing / Completed) instead of just Pending/Completed

**Action column**: Replace edit/delete with a 3-dot dropdown menu:
- **Contact Confirm** (when Pending) → sets status to "Contacted"
- **Already Contacted** (when Pending) → sets status to "Contacted"  
- **Assign Employee** (when Contacted) → opens dialog with multi-select employee list, saves to `client_request_assignments`, sets status to "Processing"
- **Mark Phy. Done** (when Processing) → sets physical_connectivity to "Done"
- **Convert to Client** (when phy done) → navigates to `/dashboard/clients/add` with prefilled data, updates setup_status to "Completed"
- **Edit / Delete** always available

**Physical Connectivity column**: Show Pending (orange) / In Progress (blue) / Done (green) badges

**SetUp By column**: Show assigned employee names (from junction table)

**SetUp Time / Duration column**: Show time elapsed since creation

**Filter additions**: 
- "Setup Status" filter gets new options: Pending, Contacted, Processing, Completed
- Add "Setup By/Assign To" filter (employee select)
- Add "Created By" filter

### Files
- 1 migration (create `client_request_assignments` table with RLS)
- Edit `src/pages/dashboard/clients/NewRequest.tsx` — full workflow rebuild
- Edit `src/integrations/supabase/types.ts` — add new table type

### Technical Details
- Employee multi-select uses existing `employees` table query
- Convert to Client prefills AddClient form via `navigate` state (already supported)
- 3-dot menu uses shadcn `DropdownMenu`
- Assign dialog shows checkboxes for employees with search

