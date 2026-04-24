

## Website Theme/Template System — ৫টি Home + ৫টি Packages page variant

### সমস্যা বুঝলাম
এখন `Home.tsx` এবং `Packages.tsx` — প্রত্যেকটা একটামাত্র fixed design। আপনি চাচ্ছেন:
1. **Multiple frontend designs (templates)** — যেমন Elementor-এ ready templates থাকে
2. **Admin panel-এ গিয়ে toggle** করলে যেকোনো template active হবে
3. **Packages page-এ Galaxy Net-এর মতো tabs** — হোম / কর্পোরেট / **ডেডিকেটেড**
4. **Dedicated tab-এ `isp_packages` table থেকে আসবে না** — সেটা manual "Call for Price" cards থাকবে (admin manage করতে পারবে)

---

## Architecture

### ১. নতুন database table — `website_templates`
```sql
website_templates (
  id uuid pk,
  page_key text,        -- 'home' | 'packages'
  template_key text,    -- 'classic' | 'split-hero' | 'centered' | 'left-rail' | 'minimal'
  name text,            -- "Classic Cyan", "Split Hero", ...
  is_active boolean,    -- প্রতি page_key-এর জন্য একটাই active
  config jsonb,         -- accent color, hero alignment, card style, section order
  created_at, updated_at
)
```
- প্রতি `page_key`-এ একটাই `is_active=true` row থাকবে (partial unique index দিয়ে enforce)
- Default seed: home=`classic`, packages=`classic`

### ২. নতুন table — `website_dedicated_packages` (Dedicated tab-এর data)
```sql
website_dedicated_packages (
  id uuid pk,
  name text,            -- "Enterprise 100 Mbps Dedicated"
  bandwidth_label text, -- "100 Mbps Symmetric"
  price_label text,     -- "Call for Price" / "৳ আলোচনা সাপেক্ষে"
  features jsonb,       -- ["Real IP", "SLA 99.9%", "24/7 Support"]
  badges text[],        -- ['BDIX','FTP','Cache','Real IP']
  is_popular boolean,
  sort_order int,
  status text default 'active'
)
```
RLS: public read for active, admin write.

---

## Frontend changes

### Folder structure
```
src/pages/public/
  Home.tsx              ← becomes a "template router"
  Packages.tsx          ← becomes a "template router"
  templates/
    home/
      ClassicHome.tsx       (existing design — refactored)
      SplitHeroHome.tsx     (hero left-image)
      CenteredHome.tsx      (centered hero, no graphic)
      LeftRailHome.tsx      (sidebar nav left, content right)
      MinimalHome.tsx       (whitespace, big type)
    packages/
      ClassicPackages.tsx   (existing — refactored)
      GalaxyStylePackages.tsx (Galaxy Net replica — wave banner + tabs)
      CompactPackages.tsx   (smaller cards, 5 per row)
      CardFlipPackages.tsx  (hover-flip cards)
      TablePackages.tsx     (comparison table)
```

### Template routers (Home.tsx, Packages.tsx)
```tsx
const { data: tmpl } = useQuery({
  queryKey: ['active-template', 'home'],
  queryFn: () => supabase.from('website_templates')
    .select('template_key, config')
    .eq('page_key', 'home').eq('is_active', true).maybeSingle()
});
const Cmp = HOME_TEMPLATES[tmpl?.template_key ?? 'classic'];
return <Cmp config={tmpl?.config ?? {}} />;
```

### Galaxy-style Packages template — main রেফারেন্স
- উপরে wave/curve gradient banner ("ইন্টারনেট প্যাকেজসমূহ")
- Pills tabs: **হোম প্ল্যান | কর্পোরেট প্ল্যান | ডেডিকেটেড**
- হোম + কর্পোরেট = `isp_packages` থেকে (price filter দিয়ে)
- **ডেডিকেটেড = `website_dedicated_packages` থেকে** — price-এর জায়গায় "Call for Price" + "যোগাযোগ করুন" button
- "জনপ্রিয়" badge orange ribbon, popular card-এ orange CTA

---

## Admin UI — `WebsiteTemplates.tsx` (নতুন page)

Route: `/dashboard/website/templates`

Layout:
```
┌─ Tabs: [হোম পেজ] [প্যাকেজ পেজ] ────────────────┐
│  Grid of template thumbnail cards:              │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│  │ [img] │ │ [img] │ │ [img] │ │ [img] │       │
│  │Classic│ │ Split │ │Center │ │Minimal│       │
│  │ ✓Active│ │ Activate│ │Activate│ │Activate│   │
│  └───────┘ └───────┘ └───────┘ └───────┘       │
│                                                  │
│  Active template config panel:                   │
│  • Accent color picker                           │
│  • Hero alignment (left/center/right)            │
│  • Card style (rounded/sharp/glass)              │
│  • Section order (drag-reorder)                  │
└──────────────────────────────────────────────────┘
```
"Activate" press → set `is_active=true` for that key, others false. Live preview link খুলবে।

### Sidebar entry (AppSidebar.tsx)
"ওয়েবসাইট" group-এ যোগ → **"থিম / টেমপ্লেট"** (Palette icon)।

### Dedicated packages admin — `WebsiteDedicatedPackages.tsx`
Standard CRUD page (existing pattern like `WebsiteServices.tsx`): name, bandwidth_label, price_label, features list, badges, sort_order, popular toggle। Sidebar entry: "ডেডিকেটেড প্যাকেজ"।

---

## Files যা create/modify হবে

### নতুন files
| File | কাজ |
|---|---|
| `supabase/migrations/<new>.sql` | `website_templates` + `website_dedicated_packages` tables, RLS, seeds |
| `src/pages/public/templates/home/ClassicHome.tsx` | বর্তমান Home content move |
| `src/pages/public/templates/home/SplitHeroHome.tsx` | নতুন variant |
| `src/pages/public/templates/home/CenteredHome.tsx` | নতুন variant |
| `src/pages/public/templates/home/LeftRailHome.tsx` | নতুন variant |
| `src/pages/public/templates/home/MinimalHome.tsx` | নতুন variant |
| `src/pages/public/templates/packages/ClassicPackages.tsx` | বর্তমান Packages move |
| `src/pages/public/templates/packages/GalaxyStylePackages.tsx` | Galaxy Net replica + Dedicated tab |
| `src/pages/public/templates/packages/CompactPackages.tsx` | dense grid |
| `src/pages/public/templates/packages/CardFlipPackages.tsx` | flip cards |
| `src/pages/public/templates/packages/TablePackages.tsx` | comparison table |
| `src/pages/public/templates/registry.ts` | `HOME_TEMPLATES` ও `PACKAGE_TEMPLATES` map + thumbnails |
| `src/pages/dashboard/website/WebsiteTemplates.tsx` | template gallery + activate + config |
| `src/pages/dashboard/website/WebsiteDedicatedPackages.tsx` | dedicated CRUD |

### Modified files
| File | পরিবর্তন |
|---|---|
| `src/pages/public/Home.tsx` | template router-এ পরিণত |
| `src/pages/public/Packages.tsx` | template router-এ পরিণত |
| `src/App.tsx` | ২টা নতুন admin route যোগ |
| `src/components/AppSidebar.tsx` | "থিম/টেমপ্লেট" + "ডেডিকেটেড প্যাকেজ" link |

---

## Outcome

- Admin panel-এ `/dashboard/website/templates` → **Home page-এর জন্য ৫টা template** + **Packages page-এর জন্য ৫টা template** thumbnail grid
- যেকোনো template "Activate" press করলে সাথে সাথে public site-এ সেটা active হবে
- প্রতি template-এ accent color, hero alignment, card style configure করা যাবে
- **Packages page-এ ৩টা tabs**: হোম / কর্পোরেট (isp_packages থেকে) + **ডেডিকেটেড** (manual cards, "Call for Price")
- Dedicated cards admin panel থেকে CRUD করা যাবে
- Galaxy Net-এর exact look পাবেন (wave hero + pill tabs + orange popular badge) — সাথে আরো ৪টা design choice
- কেউ সব কিছু maintain ও perform করতে পারবে — Elementor-এর মতো plug-and-play

