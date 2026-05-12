## লক্ষ্য

User চাচ্ছেন reference screenshot গুলোর মতো **section-wise visual separation** — Header card, **Filter card**, **Data table card** আলাদা আলাদা card-এ; এবং প্রতিটি table-এ **Column visibility toggle** (user নিজে যেগুলো চায় না সেগুলো hide করতে পারবে)। Design break না করে **একটাই reusable pattern** সব list page-এ প্রয়োগ হবে।

---

## Approach — একটাই pattern, সব table-এ

প্রতিটি list page এ তিনটে section card থাকবে:

```text
┌─ PageHeader (icon + title + description + action buttons) ──┐
└─────────────────────────────────────────────────────────────┘
┌─ FilterBar Card  [▼ collapse]  [⟳ reset] ──────────────────┐
│  Search │ Filter A │ Filter B │ ...                         │
└─────────────────────────────────────────────────────────────┘
┌─ DataTable Card  ([⚙] columns toggle, top-right) ──────────┐
│  Table rows...                                              │
└─────────────────────────────────────────────────────────────┘
```

পুরো page rewrite **নয়** — শুধু wrapping pattern বদলাবে। যেখানে আগে inline filters ছিল সেগুলো `<FilterBar>` এ মোড়ানো হবে; table-এর আগে `<DataTableCard>` মোড়ানো হবে।

---

## নতুন reusable components

### 1. `src/components/common/FilterBar.tsx`
- Card wrapper, soft amber/muted header strip ("FILTER BILLS" লেখা ছবির মতো)
- Title (default "Filters"), funnel icon
- Right side: collapse toggle + Reset button (optional)
- Children = filter inputs grid

### 2. `src/components/common/DataTableCard.tsx`
- Card wrapper for table
- Header row: title + total count badge + right-side `[⚙ Columns]` button
- `[⚙ Columns]` opens DropdownMenu with checkbox per column → toggle visibility
- Children = `<Table>...</Table>`

### 3. `src/hooks/useColumnVisibility.ts`
```ts
useColumnVisibility(storageKey, columns: { key, label, defaultVisible? }[])
→ { visible: Record<key, boolean>, toggle, reset, isVisible(key) }
```
- localStorage এ persist (per-user, per-page)
- Helper `<ColumnsToggle>` component already used by DataTableCard internally

### 4. (Optional) `src/components/common/SectionShell.tsx`
- Page-level `<div className="space-y-4">` wrapper যাতে spacing consistent থাকে

---

## Pages প্রথমে যেগুলোতে apply হবে

User priority অনুযায়ী **list/filter আছে এমন page**:

1. `src/pages/dashboard/clients/ClientList.tsx`
2. `src/pages/dashboard/billing/BillingList.tsx`
3. `src/pages/dashboard/billing/DailyCollection.tsx`
4. `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`
5. `src/pages/dashboard/clients/LeftClients.tsx`
6. `src/pages/dashboard/clients/CorporateClients.tsx` ও `HomeClients.tsx`

প্রতিটিতে শুধু:
- Existing filter JSX → `<FilterBar>...</FilterBar>` এ মোড়ানো
- Existing table JSX → `<DataTableCard title="..." count={n} columnsKey="..." columns={[...]}>` এ মোড়ানো
- Table cell render এ `{isVisible('col_x') && <TableCell>...}` guard বসানো (header + body উভয়ত)

বাকি list pages পরে একই pattern এ migrate করব (এই plan-এ scope: উপরের ৬টা)।

---

## Visual rules (design break না করে)

- নতুন color tokens না, existing `--card`, `--muted`, `--border` ব্যবহার
- FilterBar header strip: `bg-muted/60` + small funnel icon (image-279 এর মতো)
- DataTableCard header: existing card header style, ডানে gear icon + "Columns" text
- Mobile: filter card collapsible by default (chevron toggle)

---

## Out of scope এই turn-এ

- Column **reorder** (drag-drop) — শুধু show/hide এই plan-এ
- Saved filter presets
- Server-side column persistence (localStorage যথেষ্ট)

User approve করলে components তৈরি করে উপরের ৬টা page-এ apply করব।
