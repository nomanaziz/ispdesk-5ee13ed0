

## কাজ — POP Admin Mobile-Friendly Layout + Global Quick Create

POP admin সাধারণত mobile দিয়ে কাজ করে। তাই POP portal-এর জন্য একটা mobile-first shell তৈরি করব (web view অপরিবর্তিত), reference screenshot-এর মতো — উপরে header, মাঝে clickable shortcut grid + summary cards, নিচে fixed bottom-tab bar (Home / Billing / Collection / Monitoring / Support)। সাথে web + portal দুই জায়গায় একটা "Quick Create Client" floating dialog।

### ১) Mobile shell (auto-switch on viewport < 768px)

`ResellerLayout.tsx`-এ `useIsMobile()` দিয়ে detect করব। Mobile হলে নতুন `ResellerMobileShell` render হবে; desktop-এ existing sidebar layout ঠিক থাকবে।

**Mobile shell structure:**
```
┌──────────────────────────────────────┐
│ Header (blue, sticky)                │
│  avatar | popName + type | 🔍 🔔 ☰  │
│  ENGLISH/বাংলা toggle               │
├──────────────────────────────────────┤
│ Page content (scrollable)           │
│  pb-20 (space for bottom bar)       │
├──────────────────────────────────────┤
│ Bottom Tab Bar (fixed, 5 tabs)      │
│  Home | Billing | Collection | Mon. | Support │
└──────────────────────────────────────┘
+ Floating "Quick Create" FAB (bottom-right, above tab bar)
```

- Header height 62px, primary blue, white text
- Hamburger (☰) opens existing full sidebar drawer (already implemented)
- Bottom tabs: routes resolve to `/pop-admin/dashboard`, `/pop-admin/billing/list`, `/pop-admin/billing/daily-collection`, `/pop-admin/monitoring/online`, `/pop-admin/tickets`
- Active tab highlighted in primary color (icon + label)

### ২) Mobile Dashboard (`PopMobileHome.tsx`) — ১ম screenshot replica

Existing `ResellerDashboard.tsx` desktop-এ unchanged থাকে। Mobile-এ আলাদা component render হবে (same data hooks reuse):

**Sections (top → bottom):**
1. **Profile card** — avatar, name, "User Type: MAC Reseller", "Reseller Type: Active" badge, language toggle
2. **Shortcut grid (4×2 = 8 icons)** — clickable square tiles, navigate to:
   - Bill Receive → `/pop-admin/billing/list` (with pay action)
   - Bill Approval → `/pop-admin/billing/list?tab=approval`
   - Add Client → `/pop-admin/clients/add`
   - Create Ticket → `/pop-admin/tickets?action=new`
   - Fund Recharge → `/pop-admin/fund-history/credit?action=recharge`
   - Debit History → `/pop-admin/fund-history/debit`
   - Recharge Transaction → `/pop-admin/fund-history/credit`
   - Credit Transaction → `/pop-admin/fund-history/credit`
3. **Summary card** (rounded, light bg) — Monthly Bill / Collected / Due / Discount (2×2 grid)
4. **Tickets card** — Ticket / Pending / Process counts (3 columns)
5. **Bar chart** — Unpaid vs Paid per zone (reuse existing recharts data)
6. **Bottom card** — Paid Salary / Remaining Balance / Cash on Hand / Approximate Rechargeable

All data already available in `ResellerDashboard.tsx` queries — just restructured for mobile.

### ৩) Quick Create Client (web + mobile, global FAB)

নতুন `QuickCreateClientDialog.tsx` component যা:

**Trigger:**
- Mobile: floating "+" FAB button (bottom-right, above bottom-tab bar)
- Desktop (both Admin + POP): TopBar-এ "Quick Add" button (Plus icon) — admin-এর `TopBar.tsx`-এও একই button

**Form fields (only mandatory):**
- Client name *
- Mobile number *
- PPP ID / Username *
- Password *
- Zone (dropdown, branch-scoped) *
- Package (dropdown) *
- Monthly bill (auto-fill from package, editable)

**Submit:** `clients` table-এ insert with `branch_id` (POP scope) or admin-selected branch। Success toast + option to "Continue to full form" বা "Create another"।

Reuses existing zone/package lookups via `usePopScope` + branch_id filter। Generates client_code automatically (existing helper if available, else timestamp-based).

### ৪) Mobile-friendly tweaks for key existing pages

প্রতিটা page-এর জন্য mobile-specific rewrite নয় — শুধু responsive utility classes adjust:

- **Billing List** (`PopBillingList.tsx` or wherever): card layout < 768px, button-tap-friendly Pay button
- **Receive Bill / Bill Collection**: full-width inputs, larger tap targets (min h-11)
- **Add Client form**: stepper (Personal Info / Network) like 2nd screenshot — already largely OK, just adjust spacing
- **Fund Recharge**: full-width amount input + payment method selector like 3rd screenshot
- **Debit History**: card list with "Paid" badge like 1st screenshot
- **Client Monitoring**: stat-row + card list like 5th screenshot
- **Support Ticket**: search + empty state + FAB like 4th screenshot

Global tweak: `.touch-target { min-height: 44px }` utility for buttons/links on mobile।

### ৫) ফাইল পরিবর্তন

**নতুন (৪টা):**
- `src/components/reseller/mobile/ResellerMobileShell.tsx` — header + bottom tab bar wrapper
- `src/components/reseller/mobile/MobileBottomTabs.tsx` — 5-tab fixed bar
- `src/pages/reseller/PopMobileHome.tsx` — mobile dashboard (shortcut grid + cards)
- `src/components/QuickCreateClientDialog.tsx` — shared dialog (POP + Admin)

**Edit:**
- `src/components/ResellerLayout.tsx` — `useIsMobile()` দিয়ে ResellerMobileShell render conditionally
- `src/pages/reseller/ResellerDashboard.tsx` — mobile হলে `<PopMobileHome />` render
- `src/components/dashboard/TopBar.tsx` — admin-এ "Quick Add" button যোগ
- কয়েকটা list page-এ minor responsive class tweak (Billing List, Fund Recharge dialog)

### কী বদলাবে না

- Desktop POP layout, sidebar, all desktop pages — অপরিবর্তিত
- Admin dashboard layout — শুধু TopBar-এ একটা Quick Add button যোগ
- Database schema — কোনো migration নেই (Quick Create reuses existing `clients` insert)
- BW customer / client portal — অপরিবর্তিত
- Existing reports, notes, areas, bulk import — সব কাজ করবে যেমন আছে

### Apply-এর পরে expected ফলাফল

1. ✅ Mobile (< 768px) POP portal খুললেই — header + shortcut grid dashboard + fixed bottom tabs (Home/Billing/Collection/Monitoring/Support)
2. ✅ Shortcut tile tap করলে relevant page-এ যাবে; bottom tab swap-এ instant nav
3. ✅ Hamburger menu থেকে full sidebar drawer accessible (existing menu)
4. ✅ "+" FAB → Quick Create dialog → ৬টা mandatory field → instant client save
5. ✅ Admin desktop topbar-এ "Quick Add" button — same dialog (with branch selector)
6. ✅ Bill collection / Fund recharge / Add Client mobile-এ thumb-friendly (44px tap targets, full-width)
7. ✅ Desktop view, all existing features — কোনো regression নেই

