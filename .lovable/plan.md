

## সাইডবার Icon Style — MyHisab-এর মতো Colorful Filled Icons

### লক্ষ্য
আপনার দেখানো reference image-এর মতো **colorful, filled, rounded-square** আইকন admin sidebar-এ ব্যবহার করা। এখনকার plain lucide outline icons-এর বদলে প্রতিটা menu item-এর পাশে একটা **রঙিন ছোট tile** (যেমন: কেনা = কমলা, বেচা = সবুজ, ক্যাশবক্স = নীল)।

### Reference থেকে যা নিচ্ছি
- প্রতিটা menu item-এর পাশে **২২-২৬px rounded-square colored tile**
- ভিতরে সাদা/dark filled-style icon
- প্রতিটা category-র নিজস্ব রঙ (consistent palette)
- Active item-এ tile একটু বড়/bright হবে
- Section divider-এর মাঝে spacing থাকবে

### Scope (শুধু Admin Sidebar)

**যা বদলাবে:**
- `src/components/AppSidebar.tsx` — sidebar menu rendering
- নতুন helper: `src/components/sidebar/MenuIconTile.tsx` — colored tile wrapper
- Menu config (যেখানে icon define আছে) — প্রতিটা item-এ একটা `tint` color প্রপার্টি যোগ

**যা বদলাবে না:**
- Sidebar-এর structure, routing, RBAC
- Mobile bottom nav (আলাদা design)
- Portal/POP mobile shells (আগেই MyHisab-style হয়ে গেছে)
- Dark mode support — tile রঙ dark-এ slightly muted হবে

### ডিজাইন approach

#### ১. নতুন `MenuIconTile` component
```tsx
<MenuIconTile tint="orange" icon={ShoppingCart} active={isActive} />
```
- ২৪px rounded-[8px] tile
- Tint variants: `rose | orange | amber | emerald | teal | sky | indigo | violet | pink | slate | gray`
- Light mode: bright bg + white icon (e.g., `bg-orange-500 text-white`)
- Dark mode: softer (`bg-orange-500/20 text-orange-300`)
- Active state: একটু shadow + slightly larger
- Collapsed sidebar-এ tile centered, label hidden

#### ২. Icon palette mapping (category-wise)
ERP-র ১২০+ menu আছে — তাই category অনুযায়ী রঙ assign:

| Category | Tint | Examples |
|---|---|---|
| Dashboard / Home | `indigo` | হোম, ড্যাশবোর্ড |
| Sales / বেচা | `emerald` | Invoices, Customers, Collections |
| Purchase / কেনা | `orange` | Vendors, PO, GRN, Purchase Bills |
| Inventory / স্টক | `amber` | Items, Stock, Warehouse |
| Cash / Finance | `sky` | Cashbox, Bank, Expenses, Ledger |
| Network / OLT | `cyan` | OLT, ONU, MikroTik, VLAN |
| HR / People | `violet` | Employees, Attendance, Payroll |
| CRM / Tickets | `pink` | Leads, Tickets, Complaints |
| Reports | `teal` | All reports |
| Marketing | `rose` | Campaigns, SMS, Notices |
| Settings / Config | `slate` | Settings, Users, Roles, Branches |
| Website CMS | `violet` | Pages, Banners, Testimonials |

#### ৩. Sidebar config update
যেখানে menu items define হয় (sidebar config বা AppSidebar-এর ভিতরে), প্রতিটা item-এ `tint` field যোগ:
```ts
{ title: "কেনার বিল", url: "/dashboard/purchase/bills", icon: Receipt, tint: "orange" }
```

#### ৪. Section dividers
Reference-এ সেকশনের মাঝে subtle space আছে — sidebar-এ `SidebarGroup`-এর মাঝে একটু বেশি `gap` যোগ করব। Section labels (যেমন "Inventory", "Network") slightly smaller + uppercase.

#### ৫. Hover & Active state
- Hover: tile-এ slight brightness boost
- Active: tile-এ subtle shadow + row background = `bg-accent/50`
- Collapsed mode: শুধু tile দেখাবে, hover-এ tooltip-এ Bangla label

### Files affected

| File | Change |
|---|---|
| `src/components/sidebar/MenuIconTile.tsx` | নতুন component |
| `src/components/AppSidebar.tsx` | tile integration + spacing |
| Menu config (AppSidebar-এর ভিতরে বা আলাদা file) | প্রতিটা item-এ `tint` যোগ |
| `src/index.css` (optional) | কোনো নতুন token দরকার হলে |
| **Total** | **~3-4 files** |

### Out of scope (এই sprint-এ না)
- Mobile drawer sidebar (already different)
- TopBar icons
- Dashboard cards-এর icon style
- Custom SVG illustration (lucide-react ব্যবহার করেই হবে)

### Preview

```text
┌─────────────────────────────┐
│  [🟦] হোম                    │
│  [🟧] কেনার বিল              │
│  [🟩] বেচার বিল              │
│  [🟦] ক্যাশবক্স              │
│  ─────────────               │
│  [🟨] স্টক                   │
│  [🟪] কর্মচারী               │
│  [🟦] OLT                    │
│  ─────────────               │
│  [🟫] সেটিংস                 │
└─────────────────────────────┘
```

Approve করলে শুরু করছি — Admin sidebar-এ category-অনুযায়ী colorful tile icons বসানো হবে, কিছুই break হবে না।

