

## লক্ষ্য
Mikrotik Import page-এ **Bulk Profile Change** function যোগ — একসাথে multiple user select করে এক click-এ MikroTik-এ ও DB-তে profile change হবে।

## Workflow

```text
Import page → Pending Transfer tab → multiple user select (checkbox)
   ↓
"Bulk Profile Change" button চাপ (selected count সহ)
   ↓
Dialog খোলে → selected user-দের summary দেখাবে:
   • মোট: 50 জন
   • Server group: server-A (30), server-B (20)   ← একই server-এর users একসাথে handle হবে
   • Current profiles: 10mb (50)
   ↓
নতুন Profile select → server অনুযায়ী auto profile list load
   (`manage-mikrotik-ppp` action: "list-profiles")
   ↓
"পরিবর্তন করুন" চাপ
   ↓
প্রতিটা user-এর জন্য parallel call:
   manage-mikrotik-ppp { action:"update", mikrotik_id, username, profile }
   ↓
Success → mikrotik_clients.profile DB-তেও update
   ↓
Toast: "45 জন সফল, 5 জন ব্যর্থ" + per-user error log dialog-এ
```

## Logic & Edge Cases

```text
Multi-server selection হলে:
   - Users group by mikrotik_id
   - প্রতিটা server-এর জন্য আলাদা profile list fetch
   - Profile name একই হলে ✓, আলাদা হলে → user-কে warning:
     "নির্বাচিত user-রা ভিন্ন server-এ — প্রতিটা server-এর জন্য আলাদা profile select করতে হবে"
   - সরল সমাধান: এক সাথে শুধু এক server-এর users handle (filter দিয়ে guide)

যদি transferred (linked_client_id != null) user থাকে:
   - শুধু MikroTik update যথেষ্ট নয় — `clients.profile`-ও update করতে হবে
   - Transferred users-এর জন্য সতর্কতা banner
```

## পরিবর্তন

### 1. New file: `src/components/mikrotik/BulkProfileChangeDialog.tsx`
Component props:
```ts
{ open, onOpenChange, selectedClients: any[], onSuccess: () => void }
```
- `useQuery` দিয়ে selected users group by `mikrotik_id`
- Multi-server detect → warning + first server-এর জন্য কাজ allow
- `useQuery` profile list: `supabase.functions.invoke("manage-mikrotik-ppp", { body: { mikrotik_id, action: "list-profiles" }})` (per-server cache)
- Submit button: progress bar + per-user result tracking
- Result summary dialog: ✅ success count, ❌ failed list (username + error)

### 2. `src/pages/dashboard/mikrotik/Import.tsx`
- Import new dialog
- New state: `const [bulkProfileOpen, setBulkProfileOpen] = useState(false);`
- Toolbar-এ নতুন button (line 263-এর পরে, Pending Transfer mode-এ):
  ```tsx
  <Button variant="outline" size="sm" onClick={() => setBulkProfileOpen(true)} disabled={selectedIds.size === 0}>
    <Layers className="h-4 w-4 mr-1" /> Bulk Profile Change ({selectedIds.size})
  </Button>
  ```
- Bottom-এ render:
  ```tsx
  <BulkProfileChangeDialog
    open={bulkProfileOpen}
    onOpenChange={setBulkProfileOpen}
    selectedClients={clients.filter(c => selectedIds.has(c.id))}
    onSuccess={() => { setSelectedIds(new Set()); queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] }); }}
  />
  ```

## যা **বদলাবে না**
- Existing `manage-mikrotik-ppp` edge function — already supports `update` with `profile` ও `list-profiles`, কিছু change লাগবে না
- `Import.tsx`-এর existing filters, table, transfer flow — intact
- DB schema, RLS, migration — কোনো change নাই
- `BulkProfileChangeDialog.tsx` (billing folder-এর existing one) — alada file, untouched

## Files
- **New**: `src/components/mikrotik/BulkProfileChangeDialog.tsx`
- **Modified**: `src/pages/dashboard/mikrotik/Import.tsx`

approve করলে ১টি নতুন file create করব এবং ১টি file-এ ৩টি ছোট change apply করব।

