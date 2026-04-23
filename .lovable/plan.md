

## সব Page-এ Icons8 Rollout — কোনো জায়গা বাদ নয়

### সমস্যা
গত sprint-এ resolver expand হয়েছে আর sidebar/dashboard/bottom-nav-এ Icons8 বসেছে — কিন্তু **page-এর ভিতরের content** (page header, KPI cards, tab triggers, action buttons, empty states, table empty rows) এখনো lucide icon ব্যবহার করছে। তাই Property page বা অন্যান্য inner page-এ ঢুকলে পুরনো look-ই দেখা যাচ্ছে।

### সমাধান — তিন স্তরে coverage
পুরো `src/pages/` জুড়ে ১২০+ page scan করে যেখানে যেখানে lucide icon decoratively (header, card, empty state) ব্যবহার হচ্ছে, সেখানে Icons8 বসানো। Action button-এর ভিতরের ছোট icon (Edit/Delete/Plus inside Button) lucide-ই থাকবে — কারণ skeuomorphism PNG button-এ বেমানান।

#### স্তর ১ — Page Header Icon (সব ১২০ page)
প্রতিটা page-এর top-এ যে title icon আছে (যেমন Property page-এ `<Building />` + "প্রপার্টি"), সেটা auto-resolve হবে route URL দেখে। নতুন reusable: `src/components/common/PageHeader.tsx`
- Props: `title`, `description`, optional `icons8` override, optional `action` slot
- Default — current `useLocation().pathname` দিয়ে resolver call করে Icons8 খুঁজবে, না পেলে lucide fallback
- ৪৮px icon + Bangla title + muted description — সব page consistent

#### স্তর ২ — KPI / Stat Card Icon
Dashboard, Property, Customers, Invoices ইত্যাদিতে যে stat card-গুলোতে top-right corner-এ ছোট icon আছে — সব Icons8-এ swap। নতুন helper component:
- `src/components/common/StatCard.tsx` (যদি না থাকে) বা existing variant update
- Props: `label`, `value`, `icons8`, `tint`, `trend`
- ৩২px Icons8 + colored tile background

#### স্তর ৩ — Empty State + Tab Icons
- প্রতিটা list page-এর "কোনো ডেটা নেই" row → `EmptyState` component (গত sprint-এ তৈরি) বসবে
- Tab triggers (`<TabsList>`)-এ icon থাকলে Icons8 swap

### Files (rollout scope)

| Group | Files | Change |
|---|---|---|
| **নতুন component** | `PageHeader.tsx` | Auto-resolve page header with Icons8 |
| **Property module** | `properties/Properties.tsx`, `PropertyDetail.tsx`, etc. | Header + KPI + empty state |
| **Billing module** (8 page) | Invoices, Payments, BillRun, Discounts | একইভাবে |
| **CRM/Customers** (10 page) | Customers, Leads, Tickets | একইভাবে |
| **Inventory** (6 page) | Stock, Items, Vendors | একইভাবে |
| **HR** (8 page) | Employees, Attendance, Payroll, Leave | একইভাবে |
| **Network/OLT** (12 page) | OLT, ONU, Pop, MikroTik | একইভাবে |
| **Accounting** (7 page) | Cashbox, Ledger, Journal | একইভাবে |
| **VAS/SMS/Reports** (10 page) | একইভাবে | একইভাবে |
| **Settings** (5 page) | একইভাবে | একইভাবে |
| **Resolver expansion** | `iconResolver.ts` | যা যা missing — আরো ~30 mapping যোগ |
| **Resolver export** | `iconResolver.ts` | নতুন `resolveByPath(pathname)` helper |
| **মোট** | **~70 page + 2 component + resolver** |

### Approach — efficiency
- প্রথমে `PageHeader` + resolver helper বানাবো
- তারপর **batch find-replace** — প্রতিটা page-এর top-এ যে hand-rolled `<div>title + Icon</div>` pattern আছে, সেটা `<PageHeader>` দিয়ে replace
- Empty state pattern (`<TableRow><TableCell colSpan={X}>কোনো ... পাওয়া যায়নি</TableCell></TableRow>`) → conditional `<EmptyState>` swap
- ~70 file update হবে কিন্তু প্রতিটা ছোট, mechanical change

### যা বদলাবে না
- Business logic, queries, RBAC, routing, layout
- Form fields, table columns, dialog content
- Action buttons-এর ভিতরের small lucide icons (Edit/Delete/Plus/Search) — UI-তে fit
- Hishabee + Lucide fallback বহাল

### Outcome
Property page-এ ঢুকলে header-এ ঝকঝকে 3D Icons8 building, stat card-গুলোতে colored Icons8, empty state-এ বড় illustration। প্রতিটা inner page একই treatment পাবে — কোথাও পুরনো flat lucide-only look আর থাকবে না।

