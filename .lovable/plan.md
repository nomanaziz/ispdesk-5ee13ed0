

## Plan: Enforce Client Request Workflow Logic

### Current Problem
All status changes are freely available — no enforcement of the required sequential workflow.

### Required Workflow
```text
New Request (Pending)
  → Assign Employee → status=Processing, phy=In Progress
    → Change Phy to "Done"
      → Change status to "Contacted" (required step)
        → "Convert to Client" available
          → Success → status=Completed
          → Failure → stays as Contacted
```

### Changes in `src/pages/dashboard/clients/NewRequest.tsx`

**1. Gate the Status dropdown based on workflow state**
- If not assigned yet → no status change allowed (must assign first)
- If `phy !== "Done"` → only show current status (can't change normal status until phy is done)
- If `phy === "Done"` → allow changing to "Contacted" only (from Processing)
- "Completed" is NOT manually selectable — only set automatically after successful convert

**2. Gate Physical Connectivity dropdown**
- Only show Phy status change when assigned (status = Processing or later)
- Allow: Pending → In Progress → Done (sequential, already mostly works via assign)
- Add a "Mark Done" option in the Phy badge dropdown

**3. Gate "Convert to Client" action**
- Only available when `phy === "Done"` AND `status === "Contacted"`
- Currently only checks `phy === "Done"` — add `status === "Contacted"` check

**4. Auto-complete on successful convert**
- In `AddClient.tsx`, after successful save with `request_id` in state, update `client_requests.setup_status = "Completed"`
- This already exists partially — verify it works and ensure it only fires on success

**5. Make Phy status clickable for status change**
- The Phy badge should be a dropdown (like the status badge) allowing: mark as "Done" when currently "In Progress"

### Files
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/NewRequest.tsx` | Gate status/phy dropdowns based on workflow, require Contacted before Convert, make phy badge interactive |
| `src/pages/dashboard/clients/AddClient.tsx` | Ensure request status → Completed only on successful save |

