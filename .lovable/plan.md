

## Plan: Fix New Request — 3 Issues

### Problems Identified
1. **Prefill data not received in AddClient** — `handleConvertToClient` passes data via `navigate("/dashboard/clients/add", { state: { prefill: {...} } })`, but `AddClient.tsx` never reads `useLocation().state` to populate the form.
2. **Status set to "Completed" immediately on Convert click** — Before the client is actually created in the system. Should only mark completed after client is successfully saved.
3. **Action menu too complex** — User wants simplified actions: "Assign To" button directly in the Assigned To column, status change via a simple button/badge click, and only Edit + Delete in the action dropdown.

### Changes

**1. `src/pages/dashboard/clients/AddClient.tsx`**
- Import `useLocation` from react-router-dom
- On mount, check `location.state?.prefill` and populate form fields (name, contact, email, address, zone_id, sub_zone_id, package_id, monthly_bill, billing_date, customer_type, connection_type)
- Also store the `request_id` from prefill so that after successful client creation, we can mark the request as "Completed"
- After successful save (`saveMutation.onSuccess`), if `request_id` exists, update `client_requests.setup_status = "Completed"`

**2. `src/pages/dashboard/clients/NewRequest.tsx`**
- **Convert to Client**: Remove the immediate `setup_status = "Completed"` update. Just navigate with prefill data + `request_id`. Completion happens only after client is actually saved in AddClient.
- **Assign To column**: Make the assigned names clickable or add a small "Assign" button directly in the cell (opens the assign dialog).
- **Status column**: Make the status badge clickable — cycle through statuses or show a small popover/select to change status directly.
- **Action dropdown**: Simplify to only 2 items — Edit and Delete. Move assign and status controls to their respective columns.

### Files
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/AddClient.tsx` | Read prefill from location state, mark request completed after save |
| `src/pages/dashboard/clients/NewRequest.tsx` | Simplify action menu, move assign/status to columns, fix convert logic |

