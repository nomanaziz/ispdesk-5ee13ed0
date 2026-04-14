

## Plan: Rebuild Public Website to Match galaxynetbd.com Design

The current public website has a basic design. This plan rebuilds all public-facing pages and shared components to exactly replicate the galaxynetbd.com design, layout, and features -- while keeping content dynamic from the database.

### Design Elements from galaxynetbd.com

**Common across all pages:**
- Top info bar: phone number + social icons (Facebook, YouTube, WhatsApp) on dark teal/slate background
- Sticky navbar: Logo (left) + nav links (হোম, প্যাকেজ, সেবা, কভারেজ, আমাদের সম্পর্কে, বিল পরিশোধ, অফার, যোগাযোগ) + EN toggle + "টেলিযোগাযোগ" orange button + user icon
- Breadcrumb hero banner on inner pages: full-width image with overlay, page title, subtitle, and breadcrumb trail
- Footer: 4 columns (Logo+tagline+social, দ্রুত লিংক, রিসোর্স, যোগাযোগ) + bottom copyright bar
- Floating WiFi button (bottom-left)

**Home page sections (in order):**
1. Festival announcement banner (scrolling marquee)
2. Hero section with background image, title, subtitle, price badge, 3 CTA buttons
3. Stats bar (4 items: আপটাইম, গ্রাহক, এলাকা, BDIX)
4. Cache server logos marquee (Google, Meta, YouTube, Netflix, TikTok, etc.)
5. Fiber optic banner (full-width image + text overlay)
6. "কেন আমাদের?" features grid (6 cards with icons)
7. Services section (5 service cards with tags)
8. Gaming/streaming banner (image + text)
9. Popular packages (4 package cards with BDIX/FTP/Cache badges + "জনপ্রিয়" tag)
10. Speed banner (full-width)
11. Coverage check (search input)
12. How to connect (3 steps)
13. Testimonials carousel
14. About Us section with feature cards
15. Memberships & Partners badges
16. CTA section ("সংযুক্ত হতে প্রস্তুত?")

**Packages page:** Breadcrumb banner + tab filter (হোম/কর্পোরেট/ডেডিকেটেড) + package cards with speed, price, BDIX/FTP/Cache badges, feature list

**Coverage page:** Breadcrumb banner + search box + filter dropdowns (বিভাগ, জেলা, থানা, জোন) + grouped by district with upazila cards grid

**Services page:** Breadcrumb banner + highlight badges (99.9% Uptime, BDIX, etc.) + service cards with feature tags + CTA

**About page:** Breadcrumb banner + stats cards + highlight badges + timeline (আমাদের পথচলা) + team section (grouped by department) + partners

**New Connection page:** Breadcrumb banner + highlight cards (3 benefits) + form with cascading selects (বিভাগ > জেলা > থানা) + package type tabs + sidebar benefits

**Quick Pay page:** Keep existing with breadcrumb banner styling

### Files to Create/Edit

| File | Action |
|---|---|
| `src/components/public/TopInfoBar.tsx` | **New** - phone + social links bar |
| `src/components/public/PublicNavbar.tsx` | **Rewrite** - match Galaxy Net navbar |
| `src/components/public/BreadcrumbBanner.tsx` | **New** - reusable hero banner for inner pages |
| `src/components/public/PublicFooter.tsx` | **Rewrite** - 4-column footer matching Galaxy Net |
| `src/components/public/LogoMarquee.tsx` | **New** - scrolling cache server logos |
| `src/components/PublicLayout.tsx` | **Edit** - add TopInfoBar |
| `src/pages/public/Home.tsx` | **Rewrite** - all 16 sections |
| `src/pages/public/Packages.tsx` | **Rewrite** - tabbed layout + badges |
| `src/pages/public/Coverage.tsx` | **Rewrite** - filter dropdowns + district grouping |
| `src/pages/public/Services.tsx` | **Rewrite** - tag-based cards + badges |
| `src/pages/public/About.tsx` | **Rewrite** - timeline + team + partners |
| `src/pages/public/NewConnection.tsx` | **Rewrite** - cascading location + tabs |
| `src/pages/public/QuickPay.tsx` | **Edit** - add breadcrumb banner |
| `src/pages/public/Contact.tsx` | **New** - contact page (যোগাযোগ) |
| `src/pages/public/Offers.tsx` | **New** - offers page (অফার) |
| `src/App.tsx` | **Edit** - add /contact and /offers routes |

### Color Scheme (matching Galaxy Net)
- Primary: `#0891b2` (cyan-600) / `#f97316` (orange-500) for CTAs
- Dark header: `#0f172a` (slate-900) info bar
- Cards: white with subtle borders
- Text: slate-800/900 headings, slate-500 body

### Technical Details
- All content remains database-driven (packages from `isp_packages`, coverage from `districts`/`upazilas`/`zones`, services from `website_services`, etc.)
- Marquee animation via CSS keyframes (no extra library)
- Breadcrumb banner uses Unsplash placeholder images (configurable from `landing_content`)
- Team section on About page pulls from `employees` table or hardcoded demo data
- Package tabs filter by a `category` field (home/corporate/dedicated) -- will use existing `type` field or filter by price range

