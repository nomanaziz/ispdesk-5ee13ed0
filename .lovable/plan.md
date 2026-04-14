

## Fix: Division Cascade Not Working

### Problem Identified

There are **two bugs** in `ConfigCrudPage.tsx`:

1. **Bulk status action ignores cascade**: When you select multiple divisions and click "নিষ্ক্রিয়" (bulk action), `bulkStatusMutation` (line 117-129) directly updates the table without calling `onStatusToggle`. So districts and upazilas are NOT cascaded.

2. **Individual toggle also broken for cascade**: The `toggleStatus` mutation calls `onStatusToggle(id, status, row)` but **then also** invalidates the query for the current table (line 110). However, the `onStatusToggle` in `Divisions.tsx` already does the division update itself (line 10). This means the division status gets updated correctly, but there could be race conditions with rapid toggling.

### Fix Plan

**File: `src/components/config/ConfigCrudPage.tsx`**

- Update `bulkStatusMutation` to call `onStatusToggle` for each selected item (if provided), so cascade logic runs for bulk actions too.

**File: `src/pages/dashboard/config/Divisions.tsx`**

- No changes needed — cascade logic is correct.

### Technical Details

In `ConfigCrudPage.tsx`, change the `bulkStatusMutation` from:
```typescript
// Current: direct update, no cascade
for (const id of selected) {
  await supabase.from(tableName).update({ status }).eq("id", id);
}
```
To:
```typescript
// Fixed: use onStatusToggle if available
for (const id of selected) {
  if (onStatusToggle) {
    const row = items?.find((item: any) => item.id === id);
    await onStatusToggle(id, status, row);
  } else {
    await supabase.from(tableName).update({ status }).eq("id", id);
  }
}
```

Also invalidate related queries after bulk status change.

