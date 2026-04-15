

## Plan: Fix Duplicate Key Error — Support Edit Mode in AddClient

### Problem
`AddClient.tsx` always runs `supabase.from("clients").insert(payload)` regardless of whether the user is creating a new client or editing an existing one. The Edit button in `ClientActionButtons` passes `{ prefill: client, editMode: true }` via navigation state, but the save mutation ignores `editMode` entirely, causing a duplicate key violation on `clients_client_id_key`.

### Fix in `src/pages/dashboard/clients/AddClient.tsx`

1. **Read `editMode` from navigation state** — extract `location.state?.editMode` alongside `prefill`
2. **Store the existing client's `id`** — when in edit mode, preserve `prefill.id` so we can target the update
3. **Conditional save logic** — in the `saveMutation`:
   - If `editMode` and `clientId` exist → use `.update(payload).eq("id", clientId)` 
   - Otherwise → use `.insert(payload)` (current behavior)
4. **Skip MikroTik PPPoE creation in edit mode** — only create PPPoE user on MikroTik for new clients (or optionally update, but skip for now)
5. **Update success toast** — show "আপডেট হয়েছে" instead of "যোগ হয়েছে" when editing

### Technical Detail

```typescript
// Line ~23
const editMode = location.state?.editMode;
const editClientId = prefill?.id;

// Line ~131 in saveMutation
if (editMode && editClientId) {
  const { error } = await supabase.from("clients").update(payload).eq("id", editClientId);
  if (error) throw error;
} else {
  const { error } = await supabase.from("clients").insert(payload);
  if (error) throw error;
}
```

### Files
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/AddClient.tsx` | Add edit mode detection, conditional insert/update, appropriate toast messages |

