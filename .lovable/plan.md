

## লক্ষ্য
1. Admin dashboard-এ ভাষা toggle button (BN default, EN switchable)
2. সুন্দর Bangla font load করা (পড়তে সহজ, ফ্যাকাশে না)
3. Text colors darker করা যাতে readability ভালো হয়

---

## ১. ভাষা Toggle Button

`LanguageContext` (BN/EN, `t()` helper) আগে থেকেই আছে — শুধু UI button add করতে হবে।

**TopBar.tsx**-এ Globe icon-এর পাশে ছোট pill button:
```
[বাং | EN]
```
- Click করলে BN ↔ EN switch
- Default = BN (already saved in localStorage via context)
- Active language highlighted with primary color

**Sidebar + TopBar wiring**: `AppSidebar` ও `TopBar`-এর hardcoded Bangla strings গুলো `t("বাংলা", "English")` দিয়ে wrap করা হবে। এতে toggle press করলে instantly সব menu label, search placeholder, profile menu ইত্যাদি English-এ আসবে।

**Scope (realistic)**:
- ✅ Sidebar group labels + menu items (sabai 200+ items)
- ✅ TopBar (search, profile, signout)
- ✅ Dashboard landing page common headings

> Individual admin pages (120+ pages) এ hardcoded Bangla আছে — সেগুলো future iteration-এ gradually convert হবে। এই round-এ navigation/chrome English-এ যাবে, page contents BN থাকবে যতক্ষণ না আলাদাভাবে convert করা হয়।

---

## ২. Bangla Font

`index.html`-এ Google Fonts add:
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**`src/index.css`** body font:
```css
body {
  font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
  font-feature-settings: "liga", "kern";
  letter-spacing: 0.01em;
}
```

`Hind Siliguri` (Bengali-optimized, modern, clean) primary; `Noto Sans Bengali` fallback; `Inter` for English/numbers.

`tailwind.config.ts`-এ:
```ts
fontFamily: {
  sans: ['Hind Siliguri', 'Noto Sans Bengali', 'Inter', 'system-ui', 'sans-serif'],
  bengali: ['Hind Siliguri', 'Noto Sans Bengali', 'sans-serif'],
}
```

---

## ৩. Text Colors Darker (Readability)

বর্তমান issue: `--muted-foreground: 220 9% 46%` খুব faded।

**`src/index.css` light mode update**:
```css
--foreground: 224 30% 10%;          /* was 16% → now 10% (darker) */
--muted-foreground: 220 15% 32%;    /* was 46% → now 32% (much darker) */
--card-foreground: 224 30% 10%;
--popover-foreground: 224 30% 10%;
--secondary-foreground: 224 30% 10%;
--accent-foreground: 224 30% 10%;
--sidebar-foreground: 224 28% 18%;  /* was 28% → 18% */
--border: 220 14% 82%;              /* was 89% → 82% (slightly more visible) */
```

**Dark mode**-এ similar adjustment — text একটু brighter:
```css
--foreground: 220 18% 94%;          /* was 86% → 94% */
--muted-foreground: 220 15% 78%;    /* was 62% → 78% */
```

এতে যেকোনো লেখা — heading, body, muted helper text — সব আরো readable হবে, ফ্যাকাশে লাগবে না।

---

## যা **বদলাবে না**
- Public website (Home, Packages, Shop ইত্যাদি) — শুধু Admin/Dashboard scope
- Backend, database, edge functions — কোনো change নাই
- Existing primary color theme system

## Files
- **Modified**: `index.html` (font links)
- **Modified**: `src/index.css` (font-family, color tokens)
- **Modified**: `tailwind.config.ts` (font family)
- **Modified**: `src/components/TopBar.tsx` (BN/EN toggle button)
- **Modified**: `src/components/AppSidebar.tsx` (`t()` wrap for menu labels — large file but mechanical change)

approve করলে default mode-এ apply করব।

