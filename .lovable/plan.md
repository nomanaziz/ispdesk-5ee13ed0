

User চান sidebar-এ দুটো নতুন feature:
1. **মেনু search** — উপরে একটা search box যাতে যেকোনো menu item নাম দিয়ে filter করা যায়।
2. **মেনু custom order** — নিচে একটা button যেখান থেকে user নিজের preference অনুযায়ী group-গুলোকে উপর-নিচ reorder করতে পারবে।

### Approach

**Single file edit:** `src/components/AppSidebar.tsx` (sidebar component)
**LocalStorage** ব্যবহার করে user preference persist করব (per-browser, no DB change)। key: `sidebar-menu-order`।

### ১. Search Box (top)
- Logo header-এর নিচে একটা compact `Input` (Search icon সহ), `placeholder="মেনু খুঁজুন..."`
- State: `const [search, setSearch] = useState("")`
- Filter logic: search থাকলে — প্রতিটা group-এর items filter করব title match (case-insensitive, Bangla+English উভয়)। যে group-এর কোনো item match করেনি সেটা hide। Match-হওয়া group auto-expanded থাকবে।
- Collapsed sidebar মোডে search box hide।
- Clear button (✕) inside input।

### ২. Custom Order (bottom button + dialog)
- Sidebar-এর নিচে fixed একটা `Button` ("মেনু সাজান", `ArrowUpDown` icon)।
- ক্লিকে একটা `Dialog` খুলবে — ভিতরে scrollable list-এ সব group-এর label, প্রতিটার পাশে ↑/↓ button (move up/down)। "Reset to default" button-ও থাকবে।
- Save করলে order array (group label-গুলোর sequence) `localStorage`-এ save হয় এবং sidebar re-render হয়।
- Initial load-এ localStorage check → থাকলে সেই order, না থাকলে default `menuGroups` order।
- নতুন কোনো group code-এ যোগ হলে সেটা নিচে auto-append হবে (saved order-এ না থাকলেও lost হবে না)।

### Implementation details
- `useState` দিয়ে `orderedGroups` derive — useMemo দিয়ে: `savedOrder.map(label => menuGroups.find(g=>g.label===label)).filter(Boolean).concat(unsavedNewGroups)`
- Search filter `useMemo`-এ — search lowercase করে item.title.toLowerCase().includes()
- Reorder dialog: simple ↑↓ button approach (drag-drop avoided to keep zero new dependency)
- Light/dark theme styling existing pattern follow করব

### Files to edit
1. `src/components/AppSidebar.tsx` — search input, reorder dialog, localStorage hook, filter/order logic

Zero new dependencies, zero database change, zero backend impact।

