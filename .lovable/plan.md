

## Accordion Sidebar — একসাথে শুধু একটা group খোলা

### সমস্যা
এখন POP Admin আর Main Admin sidebar-এ অনেকগুলো main menu (group) একসাথে expand করা যায়। ফলে sidebar অনেক লম্বা হয়ে scroll নিচে চলে যায়।

### সমাধান (Accordion behaviour)
যে কোনো main group click → আগের সব group auto-close হবে, শুধু ক্লিক করা group-এর sub-menu open থাকবে। Active route যেই group-এ আছে সেটা by default open।

### Scope (যেসব portal-এ apply হবে)
| Portal | File | পরিবর্তন |
|---|---|---|
| Main Admin / Super Admin sidebar | `src/components/AppSidebar.tsx` | `CollapsibleGroup`-এর local `useState` সরিয়ে parent-controlled single-open state |
| POP Admin (Reseller) sidebar | `src/components/ResellerLayout.tsx` | `openGroups: Set<string>` → `openGroup: string \| null` |
| Client Portal | `src/components/PortalLayout.tsx` | এখানে collapsible group নাই — কোনো পরিবর্তন লাগবে না |

### Technical changes

**১) `ResellerLayout.tsx`**
- `openGroups` (Set) → `openGroup` (single string | null)
- Initializer: active route যেই group-এ আছে সেটার key, না পেলে `"dashboard"`
- `toggleGroup(k)`: `setOpenGroup(prev => prev === k ? null : k)`
- `isOpen = openGroup === g.key || !!search` (search চললে আগের মতই সব expanded)
- Route change হলে যদি active group ভিন্ন হয় → auto-switch (useEffect on `location.pathname`)

**২) `AppSidebar.tsx`**
- বর্তমানে প্রতিটা `CollapsibleGroup`-এ নিজস্ব `useState` — তাই multi-open হয়
- Parent (`AppSidebar` main component) যোগ করবে `const [openGroupKey, setOpenGroupKey] = useState<string|null>(activeGroupLabel)`
- `CollapsibleGroup`-এ নতুন props: `openKey`, `onToggle(key)`
- Internal `useState(open)` সরিয়ে `effectiveOpen = forceOpen ?? (openKey === group.label)`
- `onClick={() => setOpen(!open)}` → `onClick={() => onToggle(group.label)}`
- Search match থাকলে আগের মতই `forceOpen=true` (search বহাল)
- Route change হলে active group auto-open (useEffect on `location.pathname`)

**৩) Edge cases**
- Search box-এ টাইপ → সব matched group খুলবে (debug-friendly), search clear করলে আবার single-open mode
- Direct group (single item) — accordion logic apply হবে না, আগের মতই simple link
- Collapsed (mini) sidebar mode — accordion irrelevant, আগের মতই icon-only

### ফলাফল
- যেকোনো main menu click করলে আগের open group auto-close, sidebar সবসময় ছোট থাকবে
- Active route যেখানে আছে সেই group always pre-opened
- Search-based exploration আগের মতই কাজ করবে
- POP Admin + Main Admin দুই sidebar consistent behaviour

### Files to edit
- `src/components/ResellerLayout.tsx`
- `src/components/AppSidebar.tsx`

