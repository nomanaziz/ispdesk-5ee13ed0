

## Icons8 Skeuomorphism — Coverage Expansion

### লক্ষ্য
Icons8 Skeuomorphism collection (https://icons8.com/icons/skeuomorphism — 900 icons, 42 categories, free PNG) থেকে আমাদের প্রজেক্টের যত menu/page এখনো generic lucide icon দেখাচ্ছে, সবগুলোতে matching skeuomorphism PNG বসানো। Style একদম current 76টা Icons8 PNG-র মতোই (3D, colorful, interactive) — কোনো visual inconsistency হবে না।

### কেন এই approach
- **License**: Icons8 free tier — PNG up to 100px attribution ছাড়া ব্যবহারযোগ্য (CC BY-ND 3.0 equivalent)। আমরা ৬৪px PNG নেব — perfect for sidebar/cards।
- **Direct download URL**: `https://img.icons8.com/skeuomorphism/64/{icon-name}.png` — কোনো API key লাগে না, scriptable।
- **Style match**: Already-shipped 76টা icon এই collection থেকেই এসেছে — নতুনগুলো indistinguishable হবে।

### Pipeline (default mode-এ execute)

#### Phase 1 — Gap analysis + bulk download (~80-100 নতুন icon)
স্ক্রিপ্ট দিয়ে current `iconResolver.ts`-এর সব URL/title/label scan করে যেগুলো এখনো resolve হয় না সেই list বানাবো, তারপর Icons8-এর সাথে map করব এই categories থেকে:

| Skeuomorphism category | যে gap পূরণ করবে |
|---|---|
| **User interface** (47) | settings, search, edit, add, delete, filter, error, help, checked |
| **Profile** (34) | user, user-group, add-user, change-user, name, contact card |
| **Time and date** (27) | calendar, clock, alarm, today, hourglass, schedule, leave |
| **Files** (31) | document, pdf, copy, edit-file, image-file, add-file, archive |
| **Folders** (23) | opened-folder, browse-folder, archive-folder, invoices-folder |
| **Shopping** (42) | discount, gift, money, price-tag, cart, shopping-bag, basket |
| **Network** (26) | wifi, router, bluetooth, nas, cloud-sync, shared-folder |
| **City** (30) | bank, hospital, school-building, city-buildings (Branch icons) |
| **Transport** (35) | car, truck, bus, gas-station (Logistics/Delivery menus) |
| **Maps** (25) | address, map, marker, compass, world-map (Customer location) |
| **Media controls** (21) | play, pause, stop, repeat, shuffle (Live monitoring) |
| **Popular** (45) | box, cancel, document, edit, file, calculator |

ডাউনলোড script: `curl https://img.icons8.com/skeuomorphism/64/{name}.png -o src/assets/icons/icons8/{name}.png` — parallelized, ~30 sec total।

#### Phase 2 — Resolver expansion
`src/lib/iconResolver.ts`-এ map বাড়ানো হবে — আরো ~80টা entry:
- `ICONS8_BY_URL`: প্রতিটা untouched menu route
- `ICONS8_BY_TITLE`: Bangla item titles যেগুলো resolver-এ নেই
- `ICONS8_BY_LABEL`: কয়েকটা missing group label

কোনো component code change লাগবে না — সব panel আগে থেকেই resolver consume করে।

#### Phase 3 — Coverage targets
যেসব panel/page-এ আরো icon coverage দরকার:

| Area | Current state | After |
|---|---|---|
| Admin sidebar (120 routes) | ~30% Icons8 | **~95%** |
| Client Portal sidebar | ~70% Icons8 | **100%** |
| POP/Reseller sidebar | ~50% Icons8 | **95%** |
| Mobile bottom navs | 100% (already) | unchanged |
| KPI cards (Dashboard.tsx, ResellerDashboard) | Lucide | Icons8 via resolver |
| Empty states (Customers, Invoices, Tickets, OLT, Inventory list pages) | text-only | বড় Icons8 illustration |
| Section headers (page titles with icon) | Lucide | Icons8 64px |

#### Phase 4 — Empty-state component
নতুন reusable: `src/components/common/EmptyState.tsx`
- Props: `icons8` name, `title`, `description`, optional `action`
- Default 96px Icons8 illustration + muted text
- ১২টা list page-এ replace করা হবে

### Files

| File | Change |
|---|---|
| `src/assets/icons/icons8/*.png` | ~৮০ নতুন icon (script দিয়ে download) |
| `src/lib/iconResolver.ts` | Map expansion (~৮০ নতুন entry) |
| `src/components/common/EmptyState.tsx` | নতুন reusable component |
| `src/pages/dashboard/customers/*`, `invoices/*`, `tickets/*` ইত্যাদি (~12 list page) | EmptyState integration |
| `src/pages/Dashboard.tsx`, `ResellerDashboard.tsx` | KPI card icon swap |
| **মোট** | **~17 file + 80টা PNG asset** |

### যা বদলাবে না
- Database, RBAC, business logic, routing, layout
- Hishabee + Lucide fallback বহাল
- Existing 76টা icon — শুধু new addition

### License note
Icons8 free tier-এ link-back optional (we can include a tiny "Icons by Icons8" footer note on the dev `/dashboard/_icons` page only — production UI clean থাকবে)। এখানে কোনো license issue নেই, আপনি যেহেতু confirm করেছেন এটা open-source category থেকে।

### Delivery
আপনার approval-এর পর:
1. Gap-analysis script run → exact missing names list
2. Bulk download (~30 sec)
3. Resolver map বাড়ানো
4. EmptyState rollout
5. আপনাকে coverage report (before/after percentage per panel) দেব

