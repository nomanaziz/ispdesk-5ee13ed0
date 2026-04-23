

## Client Portal-এর Layout Consistency Fix

### সমস্যা (root cause)
`src/App.tsx`-এ portal routes দুই রকম pattern-এ আছে:

| Pattern | কোন pages | কী দেখায় |
|---|---|---|
| **MobileShell-only** (নতুন MyHisab style) | Dashboard, Bills, Support | Gradient header + bottom nav, **max-w-md centered** — desktop-এও মোবাইল frame |
| **PortalLayout wrapper** (পুরনো) | Profile, Notices, Ledger, Invoices, Live-usage, Speed-test, Shop, Orders, Media, Messages, Change-request, Bill-detail, Company | Sidebar + topbar — পুরনো ডিজাইন |

তাই Dashboard থেকে Notice/Profile-এ গেলে সম্পূর্ণ layout বদলে সাইডবার চলে আসে, "হোম" আইকনও বদলে যায় (MobileShell-এ `Home`, PortalLayout bottom nav-এ `LayoutDashboard`)। Desktop-এ Dashboard একটা ছোট মোবাইল frame হয়ে আটকে থাকে।

### সমাধান
**একটাই layout** — `PortalLayout` — সব portal page wrap করবে। Mobile/Tablet/Desktop তিন breakpoint-এ একই layout আলাদা responsive variants দেখাবে। MobileShell-এর সুন্দর mobile look টা PortalLayout-এর ভিতরেই move করা হবে যাতে route বদলালে কিচ্ছু "jump" না করে।

### নতুন responsive PortalLayout structure

```text
            ┌──────────────────────────────────────────┐
Desktop ≥lg │ [Sidebar 260px] │ [Topbar]               │
            │   - বড় colorful │ [Page content normal]  │
            │   icon menu     │                        │
            └──────────────────────────────────────────┘
            ┌──────────────────────────────────────────┐
Tablet md   │ [Topbar with menu button]                │
            │ [Page content full width, padded]        │
            │ [Bottom nav 5 items]                     │
            └──────────────────────────────────────────┘
            ┌─────────────────────┐
Mobile <md  │ [GradientHeader]    │ ← per-page (kept)
            │ [Page content]      │
            │ [Bottom nav + FAB]  │ ← single, from layout
            └─────────────────────┘
```

### কী করা হবে

#### ১. `PortalLayout` কে responsive করা
- **Desktop (lg+)**: এখনকার sidebar + topbar বহাল, কিন্তু sidebar item-এ Hishabee/colorful tile আইকন (admin sidebar-এর `MenuIconTile` reuse) — বড় বড় আইকন user যেটা চেয়েছেন
- **Tablet (md - lg)**: Sidebar drawer-এ লুকানো, top bar + bottom nav (5 item)
- **Mobile (<md)**: Sidebar পুরো hidden, content area কোনো extra padding ছাড়া (যাতে per-page MobileShell header full-bleed দেখায়), bottom nav layout থেকে আসবে
- **Single source bottom nav**: Mobile + Tablet দুই জায়গায় same 5-item nav (হোম=Home icon, বিল, টিকেট, লেজার, প্রোফাইল) — কোনো page-এ আর বদলাবে না

#### ২. সব portal route-কে PortalLayout-এ wrap করা
`src/App.tsx`-এ ১৩টা portal route fix:
- `/portal/dashboard`, `/portal/bills`, `/portal/support` — এগুলো এখন PortalLayout-এ যাবে
- বাকিগুলো আগে থেকেই PortalLayout-এ আছে — শুধু verify

#### ৩. Page-level cleanup
- `PortalDashboard.tsx`, `PortalBills.tsx`, `PortalSupport.tsx` থেকে `MobileShell` + `BottomNav` import সরাবো
- সুন্দর `GradientHeader` + `IconGrid` + `StatCardPair` content **থাকবে** — শুধু shell wrapper সরবে; layout নিজে wrapper দেবে
- Mobile-এ header full-width edge-to-edge দেখাতে layout-এর `<main>` mobile-এ `px-0`, tablet+desktop-এ padded

#### ৪. Sidebar আইকন বড় ও colorful
Reference image-এর মতো desktop sidebar item-এ:
- Lucide icon → `MenuIconTile`-এর মতো ৩২px rounded colored tile (admin sidebar-এর সাথে consistent)
- Active item-এ tile একটু bright + slight scale
- Mobile drawer-এ same style

#### ৫. Bottom nav consistency
এই **একই 5 items সর্বত্র**, কোনো page-এ না বদলাবে:
| icon | label |
|---|---|
| Home (lucide) | হোম |
| Receipt | বিল |
| HeadphonesIcon | সাপোর্ট |
| BookOpen | লেজার |
| UserCog | প্রোফাইল |

(`PortalDashboard`-এ আগে `Home` icon, `PortalLayout`-এ আগে `LayoutDashboard` ছিল — এই mismatch-ই user-এর "হোম আইকন বদলে যাচ্ছে" complaint। এখন সব জায়গায় একটাই source of truth।)

### Files

| File | Change |
|---|---|
| `src/components/PortalLayout.tsx` | Responsive 3-breakpoint layout, colorful icon tiles, single bottom nav |
| `src/App.tsx` | ৩টা route-এ `<PortalLayout>` wrap যোগ |
| `src/pages/portal/PortalDashboard.tsx` | `MobileShell`/`BottomNav` সরিয়ে শুধু content + header |
| `src/pages/portal/PortalBills.tsx` | একই cleanup |
| `src/pages/portal/PortalSupport.tsx` | একই cleanup |
| **মোট** | **৫ files** |

### যা বদলাবে না
- Page content, queries, business logic, RBAC
- Hishabee icon set
- Reseller/POP-Admin layout (আলাদা)
- Mobile-এ MyHisab-style colorful look — শুধু consistent থাকবে

### Outcome
যেকোনো portal page-এ গেলে — Dashboard থেকে Notice থেকে Profile — same sidebar (desktop), same topbar, same bottom nav (mobile/tablet)। কোনো "হঠাৎ sidebar আসা" বা "icon বদলে যাওয়া" নেই। Desktop-এ আর মোবাইল frame-এ আটকানো না, পুরো width ব্যবহার হবে।

