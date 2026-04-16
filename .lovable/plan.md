

## Vuexy-Style Theme Overhaul

### লক্ষ্য

পুরো admin panel-কে Vuexy demo-এর মতো modern, clean, professional look দেওয়া। Customizer panel, card design, sidebar, topbar, login page — সব upgrade হবে। তবে data-dense layout বজায় রাখার জন্য gap কম রাখব।

### Vuexy থেকে যা নেওয়া হবে

1. **Customizer Panel (ডান পাশে Settings drawer)** — Primary color picker, Light/Dark/System theme, Sidebar layout (expanded/collapsed), Content width (compact/wide)
2. **Card Design** — Subtle shadow, light border, icon-with-background style, clean typography
3. **Sidebar** — White/light background option, cleaner menu styling, better active state highlight
4. **TopBar** — Cleaner layout, notification bell, search bar styling
5. **Login Page** — Vuexy-style centered card with illustration

### পরিবর্তন সমূহ

#### 1. Theme System Upgrade (`ThemeContext.tsx` + `index.css`)

- Primary color dynamic switching: 7টি preset color (Vuexy-style — purple, blue, teal, red, orange, green, cyan)
- Light/Dark/System mode support (System = OS preference follow করবে)
- CSS variables dynamically update হবে primary color change-এ
- Skin: Default (shadow-based) vs Bordered (border-based cards)

#### 2. Customizer Drawer (`src/components/ThemeCustomizer.tsx` — নতুন)

Vuexy-র মতো ডান পাশে একটা floating button (settings gear icon), click করলে Sheet/Drawer open হবে:
- **Theming** section: Primary Color circles (7 colors), Theme (Light/Dark/System icons)
- **Layout** section: Sidebar mode (Expanded/Collapsed), Content (Compact/Wide)
- Reset button
- সব settings localStorage-এ save হবে

#### 3. ThemeSwitcher Replacement

বর্তমান Popover-based ThemeSwitcher remove হবে — Customizer drawer তার কাজ করবে। TopBar-এ শুধু light/dark toggle icon থাকবে (quick switch)।

#### 4. Card Styling (`index.css` + `card.tsx`)

- Cards-এ softer shadow: `shadow-sm hover:shadow-md`
- Bordered skin-এ: `shadow-none border` style
- StatCard redesign: Vuexy-style — icon একটু বড়, light background avatar (e.g., `bg-primary/10 text-primary`), value bigger
- Dashboard-এ gap কম: `gap-2` (data dense)

#### 5. Sidebar Restyle (`AppSidebar.tsx`)

- Light theme-এ white background sidebar (Vuexy-style)
- Dark theme-এ current dark sidebar
- Active item: primary color left border + light primary background
- Group label: uppercase, smaller, muted color
- Better hover effects

#### 6. TopBar Restyle (`TopBar.tsx`)

- Cleaner search input (Vuexy-style `⌘K` search)
- Bell icon for notifications placeholder
- User avatar dropdown improvement
- Quick theme toggle (sun/moon icon)

#### 7. Login Page Restyle (`Login.tsx`)

- Vuexy-style: centered card, left side এ decorative SVG shapes (tree/geometric)
- Cleaner form layout
- Primary-color submit button (gradient remove, solid primary)
- "ISP Desk"-এ স্বাগতম header
- বাংলা labels

#### 8. Dashboard Cards Restyle (`Dashboard.tsx`)

- StatCard: Vuexy-style light-bg avatar instead of solid colored bg
- e.g., `bg-blue-500/10 text-blue-500` icon container
- Value font larger, label smaller
- Compact gap between cards

### Files

| File | Change |
|------|--------|
| `src/contexts/ThemeContext.tsx` | Primary color + skin + layout settings যোগ |
| `src/index.css` | CSS variables update, light/dark mode refine, bordered skin |
| `src/components/ThemeCustomizer.tsx` | **নতুন** — Vuexy-style settings drawer |
| `src/components/ThemeSwitcher.tsx` | Quick light/dark toggle-এ simplify |
| `src/components/TopBar.tsx` | Notification bell, quick toggle, cleaner layout |
| `src/components/AppSidebar.tsx` | Light/dark adaptive sidebar, better active states |
| `src/components/DashboardLayout.tsx` | Content width support (compact/wide) |
| `src/pages/Login.tsx` | Vuexy-style centered card, বাংলা labels, solid button |
| `src/pages/Dashboard.tsx` | StatCard restyle — light avatar bg, compact gaps |
| `src/components/ui/card.tsx` | Skin-aware shadow vs bordered |
| `src/App.tsx` | ThemeCustomizer mount |

### Approach

- Phase 1 (এখন): Theme system + Customizer + Card + Sidebar + TopBar + Login + Dashboard
- বেশি gap রাখব না — data-dense ISP ERP-র জন্য compact layout
- Vuexy-র exact copy না, Vuexy-inspired — আমাদের existing structure-এ adapt করব

