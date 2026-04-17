

## Online Client Monitoring — Column Sorting Plan

### Goal
প্রত্যেকটা column header-এ click করে ascending/descending sort করা যাবে। Status column sort করলে সকল Online একসাথে / সকল Offline একসাথে দেখাবে। Zone, Client Code, Name — সব column-এ একই sorting behavior।

### Approach (single file: `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`)

**1. Sort state**
```typescript
const [sortBy, setSortBy] = useState<string | null>(null);
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
```

**2. Sortable header component**
- প্রতিটা `TableHead`-এ click handler — first click → asc, second → desc, third → reset
- Header-এর পাশে icon: `ArrowUp` / `ArrowDown` / `ArrowUpDown` (lucide-react, already used)
- Cursor pointer + hover effect

**3. Sortable columns**
- Client Code (string, natural sort: A1, A2, A10)
- Name (string, locale-aware Bangla+English)
- Mobile (string)
- Zone (string)
- Package (string)
- Status (online/offline — grouping effect)
- IP Address (numeric octet sort)
- Uptime / Session time (numeric)
- Upload / Download (bytes numeric)
- Last seen (date)

**4. Sort logic** (useMemo over filtered rows)
```typescript
const sortedRows = useMemo(() => {
  if (!sortBy) return filteredRows;
  return [...filteredRows].sort((a, b) => {
    const av = getValue(a, sortBy), bv = getValue(b, sortBy);
    // null/undefined always last
    // string: localeCompare with numeric:true
    // number/date: subtract
    return sortDir === "asc" ? cmp : -cmp;
  });
}, [filteredRows, sortBy, sortDir]);
```

**5. UX details**
- Active sort column header → primary color + bold
- Default order preserved when sort cleared (3rd click)
- Sort persists across auto-refresh (state survives refetch)
- Mobile: header still clickable, icon visible

### Files to edit
- `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` — add sort state, sortable headers, sort memo

Zero DB change, zero new dependency, zero backend impact.

