

## সমস্যা

1. **Navbar** (`PublicNavbar.tsx`) hardcoded — `website_menu` table থেকে read করছে না, তাই DB-তে delete করলেও site-এ থেকে যায়।
2. **Footer** (`PublicFooter.tsx`) সম্পূর্ণ hardcoded — admin থেকে edit করার কোনো option নেই।
3. **HomepageEditor** `section='homepage'` filter করে — কিন্তু DB-তে actual sections হলো `hero`, `about`, `faq`, `settings`। তাই কিছুই দেখায় না।
4. **Home page** (`Home.tsx`) সব text/image hardcoded।

## সমাধান

### 1. Navbar — DB-driven menu
- `PublicNavbar.tsx` → `website_menu` table থেকে `status='active'` items load করবে (sort_order order-এ)
- Hardcoded `navLinks` array সরিয়ে fallback হিসেবে রাখবে (DB খালি হলে)
- Delete/add immediately reflect হবে

### 2. Footer — DB-driven groups
- নতুন menu group system: `website_menu`-তে existing `parent_id` কাজে লাগিয়ে footer columns তৈরি করব
- বা সহজ approach: `website_menu`-তে নতুন `location` column যোগ করি (`header` | `footer_quick` | `footer_resource`)
- **Migration**: `ALTER TABLE website_menu ADD COLUMN location text DEFAULT 'header'`
- Admin form-এ Location dropdown
- `PublicFooter.tsx`-এ "দ্রুত লিংক" ও "রিসোর্স" sections DB থেকে load
- Brand text, contact info (phone/email/address) — `landing_content` section `footer` থেকে load (editable)

### 3. HomepageEditor — সব section show
- `WHERE section='homepage'` filter সরাবো → সব sections দেখাবে
- Section dropdown filter যোগ করবো (hero, about, faq, footer, settings, homepage, ইত্যাদি)
- Form-এ section input/select থাকবে
- "প্রিসেট কী যোগ করুন" — known section/key list থেকে দ্রুত pick

### 4. Home page থেকে content read
- `HeroSection` → `landing_content[section=hero, key=main]` থেকে title/subtitle/CTA/price load
- `FestivalBanner` text → `landing_content[section=hero, key=marquee]`
- Fallback values থাকবে DB খালি হলে
- (FeaturesSection, GamingBanner, FiberBanner — পরবর্তী phase-এ; এখন hero + marquee দিয়ে শুরু)

### 5. Footer content editable
- Brand description, phone, email, address → `landing_content[section=footer]`
- Admin HomepageEditor (renamed → "সাইট কন্টেন্ট এডিটর") থেকে edit

## Files

**Migration:**
- `ALTER TABLE website_menu ADD COLUMN location text NOT NULL DEFAULT 'header'`
- Existing 4 rows → `location='header'`
- Seed default footer menu rows + `landing_content` rows for hero/footer if missing

**Edit:**
- `src/components/public/PublicNavbar.tsx` — DB query
- `src/components/public/PublicFooter.tsx` — DB query for menu + content
- `src/pages/dashboard/website/WebsiteMenu.tsx` — Location dropdown (header/footer_quick/footer_resource)
- `src/pages/dashboard/website/HomepageEditor.tsx` — সব section show, section selector, preset keys
- `src/pages/public/Home.tsx` — hero ও marquee content DB থেকে

## ফলাফল

- মেনু এডিটর থেকে delete/add → সাথে সাথে website-এ reflect
- Footer-এর "দ্রুত লিংক" ও "রিসোর্স" admin থেকে control
- Footer-এর contact info (phone/email/address) editable
- HomepageEditor-এ existing সব content (hero/about/faq/settings) দেখা যাবে এবং edit করা যাবে
- Home page hero text DB থেকে control করা যাবে

