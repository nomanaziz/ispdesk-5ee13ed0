

## মোবাইল অ্যাপ স্টাইল রিডিজাইন — POP Admin ও Client Portal

### লক্ষ্য
আপনার দেখানো MyHisab অ্যাপের মতো **clean, colorful, icon-driven, mobile-first** ডিজাইনে POP Admin এবং Client Portal সাজানো। ব্যবসা আলাদা (ISP/ERP) — তাই content আপনার, কিন্তু **look & feel** ওই ধরনের।

### Reference থেকে যা নিচ্ছি (image-210, image-211)
- **Top gradient header** — bold রঙিন (pink/teal) ব্যানার, balance/summary বড় করে
- **Card grid icons** — ৩-column grid, প্রতিটা feature একটা colorful icon + Bangla label
- **Soft rounded cards** — বড় border-radius, light shadow, প্রচুর white space
- **Bottom nav bar** — ৪-৫ icon + center floating "+" FAB
- **Tab pills** — rounded pills (selected = filled gradient)
- **List rows** — left circular icon + title + subtitle + right amount (color coded)
- **Bengali typography** — বড়, পরিষ্কার, বেশি line-height

### Scope (২ surface, Admin বাদ)

**A. Client Portal** (`/portal/*`) — গ্রাহক যা মোবাইলে দেখে
- Home (dashboard)
- Bills / Payments
- Tickets / Support
- Profile

**B. POP Admin Mobile** (`/pop-admin/*` ও `/reseller/*`) — মাঠ পর্যায়ের POP মালিক
- Dashboard summary
- Clients
- Collections / Bills
- Tickets
- Reports
- Settings

**Admin (`/dashboard/*`) — অপরিবর্তিত** (desktop ERP, আলাদা design system)

### ডিজাইন সিস্টেম (নতুন mobile theme tokens)

`src/index.css` + `tailwind.config.ts`-এ নতুন scoped tokens (admin theme touch হবে না):

```css
[data-theme-scope="portal"], 
[data-theme-scope="pop"] {
  --m-primary: 340 82% 52%;        /* pink-rose, MyHisab style */
  --m-primary-2: 173 58% 45%;      /* teal accent */
  --m-bg: 0 0% 98%;
  --m-card: 0 0% 100%;
  --m-success: 142 71% 38%;
  --m-danger: 0 84% 55%;
  --m-warning: 38 92% 50%;
  --m-radius-card: 1.25rem;
  --m-radius-pill: 9999px;
  --m-shadow-soft: 0 4px 14px hsl(0 0% 0% / 0.06);
}
```

User চাইলে পরে অন্য রঙ pick করতে পারবে (ThemeContext-এ already scope-aware)।

### নতুন reusable mobile components

`src/components/mobile/`:
- `MobileShell.tsx` — gradient header + content area + bottom nav wrapper
- `GradientHeader.tsx` — top pink/teal gradient banner with title, balance/stat box, action icons
- `IconCard.tsx` — colorful rounded square with icon + Bangla label (3-col grid item)
- `IconGrid.tsx` — responsive 3-column grid container
- `StatCardPair.tsx` — green income / red expense বড় card jodi (image-210 মতো)
- `PillTabs.tsx` — rounded filled pills (image-211 মতো tabs)
- `ListRow.tsx` — circular icon + text + amount row
- `BottomNav.tsx` — 4 nav + center floating FAB "+"
- `FloatingAddButton.tsx` — center "+" with gradient
- `ScreenTitle.tsx` — bold red-script style page title (top centered)

প্রতিটা lucide-react icon ব্যবহার করবে, রঙ category অনুযায়ী।

### Page-by-page changes

**Client Portal (`src/pages/portal/`)**
1. `PortalDashboard` → MobileShell + GradientHeader (Balance: ৳ due) + StatCardPair (এই মাসের বিল / পরিশোধিত) + IconGrid (বিল, পেমেন্ট, টিকেট, ব্যবহার, প্যাকেজ, সাপোর্ট, অভিযোগ, প্রোফাইল) + BottomNav
2. `PortalBills` → GradientHeader + PillTabs (Recent / Paid / Due) + ListRow তালিকা
3. `PortalTickets` → একই pattern
4. `PortalProfile` → header + cards

**POP Admin (`src/pages/reseller/` ও `src/pages/pop-admin/`)**
1. Dashboard → GradientHeader (আজকের কালেকশন) + StatCardPair (মোট ক্লায়েন্ট / Active) + IconGrid (ক্লায়েন্ট, বিল, কালেকশন, টিকেট, রিপোর্ট, কমিশন, ব্যান্ডউইথ, সেটিংস) + BottomNav
2. Clients list → ListRow (ক্লায়েন্ট icon + নাম + প্যাকেজ + due)
3. Collections → PillTabs + ListRow
4. Reports → IconGrid (রিপোর্ট ক্যাটাগরি)

**Layout wiring**
- `src/layouts/PortalLayout.tsx` ও `src/layouts/PopAdminLayout.tsx` (যেটা আছে) → MobileShell দিয়ে wrap, পুরনো sidebar mobile-এ hidden
- Desktop-এ (md+) — same components কিন্তু centered max-width 480px container ("phone frame" feel) অথবা wider grid (configurable)

### Responsiveness
- Mobile-first (default)
- Tablet/desktop-এ centered phone-style container (max-w-md mx-auto) — যেহেতু এটা mobile-app feel
- Existing `useIsMobile` hook ব্যবহার

### যা বদলাবে না
- Admin ERP (`/dashboard/*`) — আগের desktop look অপরিবর্তিত
- Database, business logic, routes — কিছুই না
- ThemeContext scope mechanism — already আছে, শুধু tokens যোগ
- Bengali fonts — Hind Siliguri preserved

### Files (estimate)

| Group | Count | Note |
|---|---|---|
| New mobile components | ~10 | `src/components/mobile/*` |
| Theme tokens | 2 | `index.css`, `tailwind.config.ts` |
| Portal pages | ~6 | Dashboard, Bills, Tickets, Profile, Payments, Usage |
| POP Admin pages | ~8 | Dashboard, Clients, Collections, Tickets, Reports, Commission, Bandwidth, Settings |
| Layouts | 2 | PortalLayout, PopAdminLayout |
| **Total** | **~28 files** | Admin ERP touched: 0 |

### দুই ধাপে delivery (recommended)

**Phase 1 (এই sprint):** Design system + reusable components + Client Portal ৩ প্রধান page (Dashboard, Bills, Tickets) — আপনি দেখে feedback দিবেন

**Phase 2:** Feedback অনুযায়ী tweak + POP Admin সব page + বাকি Portal pages

### ফলাফল preview

```text
┌─────────────────────────────┐
│ ▓▓▓ Gradient Pink Header ▓▓▓│
│  বকেয়া বিল                  │
│  ৳ 1,200.00      🔔  ⚙      │
└─────────────────────────────┘
   ┌────────┐  ┌──────────────┐
   │ 🟢 Paid│  │ 💰 মোট আয়   │
   │ ৳800   │  │ ৳60,000      │
   └────────┘  └──────────────┘
   ╭─── Quick Actions ───╮
   │ 💵    📄    🎫       │
   │ পেমেন্ট  বিল   টিকেট  │
   │                      │
   │ 📊    📦    👤       │
   │ ব্যবহার প্যাকেজ প্রোফাইল│
   ╰──────────────────────╯
┌─────────────────────────────┐
│  🏠   💳   ➕   🎫   ⚙       │
└─────────────────────────────┘
```

Phase 1 দিয়ে শুরু করি — approve করলে design system + Client Portal Dashboard/Bills/Tickets বানিয়ে দেখাচ্ছি।

