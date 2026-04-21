
## লক্ষ্য
POP Admin / Reseller panel-কে main admin panel-এর সাথে একই visual system-এ আনা:
1. একই darkened color tone
2. একই বাংলা default + English toggle behavior
3. POP layout/header/sidebar-এ admin-এর মতো cleaner, higher-contrast design
4. POP-specific page heading/button/table text-এ language parity

## Root cause
POP panel এখন `src/components/ResellerLayout.tsx` নামে আলাদা custom shell ব্যবহার করছে।  
Main admin panel-এ language toggle + darker readable tone already এসেছে, কিন্তু POP shell-এ এখনো:
- hardcoded English menu/search/logout text আছে
- header styling admin `TopBar`-এর মতো নয়
- POP-specific pages (`src/pages/reseller/**`) এ অনেক hardcoded English labels আছে

Global theme tokens (`src/index.css`) already darker করা হয়েছে, তাই remaining gap মূলত layout + text layer-এ।

## কী build হবে

### 1. POP layout-এ admin-এর same language behavior
`src/components/ResellerLayout.tsx`-এ `useLanguage()` যোগ করা হবে।

এখানে:
- ছোট `[বাং | EN]` toggle button add হবে
- default Bengali থাকবে
- English switch করলে menu labels, search placeholder, logout, website button, sub-user label ইত্যাদি change হবে
- search filter Bengali + English দুই labelেই কাজ করবে

### 2. POP sidebar/header-কে admin tone-এর সাথে align করা
`ResellerLayout`-এর shell classes admin `TopBar`/`DashboardLayout` tone অনুযায়ী update হবে:
- header: `bg-card/95`, subtle border, better spacing
- sidebar: same sidebar token usage, stronger readable text contrast
- buttons/hover states: admin panel-এর current tone match করবে
- mobile drawer/open state stylingও একই family-তে আনা হবে

এতে POP panel visually আলাদা না লেগে same product-এর অংশ মনে হবে।

### 3. POP menu labels bilingual করা
`groups` array-তে Bangla labels primary করা হবে, English fallback mapping রাখা হবে।

উদাহরণ:
- Dashboard → ড্যাশবোর্ড
- Configuration → কনফিগারেশন
- Employee → কর্মচারী
- Billing → বিলিং
- Reports → রিপোর্ট
- Logout → লগআউট

English mode-এ clean English labels দেখাবে, Bangla mode-এ Bengali labels দেখাবে।

### 4. POP-specific reseller pages-এ visible text parity
যেসব POP pages admin shell use করে না, সেগুলোর visible hardcoded text translate-ready করা হবে।

প্রথম ধাপে অন্তত এই files:
- `src/pages/reseller/ResellerDashboard.tsx`
- `src/pages/reseller/ResellerSettings.tsx`
- `src/pages/reseller/ResellerUsers.tsx`
- `src/pages/reseller/ResellerTickets.tsx`
- `src/pages/reseller/ResellerInvoices.tsx`
- `src/pages/reseller/ResellerPurchaseOrders.tsx`
- `src/pages/reseller/config/PopPackages.tsx`

এখানে:
- page title
- section heading
- button labels
- empty states
- table headers
- save/cancel/search/show entries ধরনের common UI text
BN/EN toggle-এর সাথে switch করবে।

### 5. Admin-style text readability POP pages-এ consistent করা
যেখানে POP pages-এ muted text, helper text, empty states, subtitle extra faded লাগছে, সেখানে class usage admin-style readable tone অনুযায়ী refine করা হবে:
- `text-muted-foreground` kept but with proper hierarchy
- key headings/body text stronger রাখা
- card/table sections same readability standard-এ আনা

## Technical details
- `LanguageProvider` already app root-এ আছে, তাই POP panel-এ নতুন context plumbing লাগবে না
- `ResellerLayout.tsx`-এ `tr()` / translation map pattern add করা হবে, similar to `AppSidebar.tsx`
- Search logic bilingual হবে: Bangla label + English translation দুটোতেই filter করবে
- `src/index.css` global darker tokens unchanged থাকবে; POP shell শুধু সেই tokens betterভাবে consume করবে
- কোনো database / edge function / backend change লাগবে না

## যা বদলাবে না
- POP business logic
- permissions / auth flow
- tariff / package pricing logic
- main admin routing structure
- public website

## Files
- `src/components/ResellerLayout.tsx` — POP shell, header, sidebar, toggle, translated labels
- `src/pages/reseller/ResellerDashboard.tsx` — dashboard labels
- `src/pages/reseller/ResellerSettings.tsx` — settings form labels/buttons
- `src/pages/reseller/ResellerUsers.tsx` — user management text/actions
- `src/pages/reseller/ResellerTickets.tsx` — ticket UI text
- `src/pages/reseller/ResellerInvoices.tsx` — invoice list text
- `src/pages/reseller/ResellerPurchaseOrders.tsx` — purchase orders text
- `src/pages/reseller/config/PopPackages.tsx` — package page text/search/pagination labels

## Apply-এর পরে expected result
1. POP panel-এও Bengali default থাকবে
2. উপরে ছোট BN/EN toggle থাকবে
3. POP header/sidebar color tone main admin-এর মতো dark/readable হবে
4. POP menu, search, logout, common headings same design language follow করবে
5. User আর main admin vs POP admin-এ আলাদা/অসম design feel করবে না
