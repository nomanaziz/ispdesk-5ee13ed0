
## কাজ ৩টা

### 1. Login page-এ Header + Footer
`src/pages/Login.tsx` currently bare — `PublicLayout` wrap নেই। Wrap করব `PublicLayout`-এ যাতে navbar + footer আসে।

### 2. Front ↔ Back cross-navigation button
- **Front → Back**: Already navbar-এ logged-in dropdown-এ "ড্যাশবোর্ড / আমার পোর্টাল" link আছে (গত step-এ যোগ হয়েছে)। ✅
- **Back → Front**: Admin `DashboardLayout`-এর TopBar এবং Portal `PortalLayout`-এর header-এ "ওয়েবসাইটে যান" (Home icon) button যোগ করব → `/` route-এ যাবে।
  - Files: `src/components/TopBar.tsx` (admin), `src/components/PortalLayout.tsx` (portal), `src/components/ResellerLayout.tsx` (reseller)

### 3. Bangla / English language toggle (front-end only, default Bangla)
নতুন lightweight i18n setup শুধু **public site**-এর জন্য (admin/portal পুরো বাংলা থাকবে, scope বড় হয়ে যাবে নাহলে)।

- `src/contexts/LanguageContext.tsx` — `lang: "bn" | "en"`, `setLang`, `t(bn, en)` helper, localStorage persist (`ispdesk-lang`), default `"bn"`
- `App.tsx`-এ `LanguageProvider` wrap (public routes-এর বাইরে রাখলেও সমস্যা নেই, top-level-এ)
- Navbar-এ ছোট toggle button: `বাং | EN` (active highlighted)
- Public components-এ ব্যবহার:
  - `PublicNavbar.tsx` — menu titles, button labels (বিল পরিশোধ/Pay Bill, কানেকশন নিন/Get Connection, লগইন/Login, ড্যাশবোর্ড/Dashboard, লগআউট/Logout)
  - `PublicFooter.tsx` — section headings (দ্রুত লিংক/Quick Links, রিসোর্স/Resources, যোগাযোগ/Contact)
  - `TopInfoBar.tsx` — helpline text
  - `Login.tsx` — labels & placeholders
  - `PublicLayout.tsx` — floating WiFi tooltip
- DB থেকে আসা content (menu titles, brand name, etc.) — যেমন আছে তেমনই থাকবে (single language source); শুধু static UI strings translate হবে

**Scope note**: পুরো public site-এর সব page (Home/Packages/About ইত্যাদি)-এর body content translate করা বড় কাজ — এই step-এ শুধু **chrome** (navbar/footer/login/topbar) translate করছি, যাতে toggle visible এবং কাজ করে। বাকি page-গুলো incremental ভাবে পরে যোগ করা যাবে।

## Files

**New:**
- `src/contexts/LanguageContext.tsx`

**Edit:**
- `src/App.tsx` — LanguageProvider wrap
- `src/pages/Login.tsx` — PublicLayout wrap + t() labels
- `src/components/public/PublicNavbar.tsx` — language toggle button + t() labels
- `src/components/public/PublicFooter.tsx` — t() section headings
- `src/components/public/TopInfoBar.tsx` — t() helpline
- `src/components/PublicLayout.tsx` — t() WiFi tooltip
- `src/components/TopBar.tsx` — "ওয়েবসাইটে যান" button (admin)
- `src/components/PortalLayout.tsx` — "ওয়েবসাইটে যান" button (portal)
- `src/components/ResellerLayout.tsx` — "ওয়েবসাইটে যান" button (reseller)

কোনো DB change নেই।

## ফলাফল

- Login page এখন full header + footer সহ দেখাবে
- Admin/Portal/Reseller dashboard থেকে এক ক্লিকে website-এ ফেরা যাবে; website-এ logged-in হলে dropdown থেকে dashboard-এ যাওয়া যাবে
- Public site-এর navbar-এ `বাং | EN` toggle; default বাংলা; choice browser-এ remember হবে
