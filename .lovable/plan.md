

## Icons8 আইকন প্যাক — পুরো প্রজেক্টে integration

### লক্ষ্য
আপনার আপলোড করা `Icons8.zip` + `Icons8_1.zip`-এর ভিতরের animated/interactive আইকনগুলো প্রজেক্টের সব panel-এ (Admin, POP/Reseller, Client Portal — desktop + tablet + mobile) যেখানে যেটা মানানসই, সেখানে বসানো হবে। পুরনো Hishabee আইকনগুলো যেখানে Icons8-এ ভালো alternative আছে, সেখানে replace হবে; বাকি জায়গায় Hishabee + lucide fallback থাকবে।

### Pipeline (default mode-এ execute হবে)

#### Phase 1 — Inventory + setup
১. দুটো zip extract → `src/assets/icons/icons8/`
- ফাইলগুলো সম্ভবত `.png` / `.svg` / `.gif` / `Lottie.json` mix
- প্রতিটা file open করে preview দেখে semantic নাম দেব (যেমন `download (12).png` → `wallet.png`)
- Format-wise count আপনাকে report করব
২. নতুন reusable component `src/components/icons/Icons8Icon.tsx`
- `import.meta.glob` দিয়ে eager-load
- Props: `name`, `size`, `className`, `alt`
- Lottie support: `.json` থাকলে `lottie-react` দিয়ে hover-play (interactive feel)
- Fallback: name না পেলে `null` → caller Hishabee/lucide-এ পড়বে
৩. Resolution helper `src/lib/iconResolver.ts`
- Priority: **Icons8 → Hishabee → Lucide**
- একটা central map: `{ "ড্যাশবোর্ড": "dashboard", "ক্রয়": "cart", ... }`
- সব panel এই helper ব্যবহার করবে — single source of truth

#### Phase 2 — Panel-wise rollout
| Panel | File | কোথায় বসবে |
|---|---|---|
| **Admin Sidebar** | `src/components/AppSidebar.tsx` + `MenuIconTile.tsx` | প্রতিটা menu group + item-এ Icons8 priority |
| **Admin Dashboard cards** | `src/pages/Dashboard.tsx` | KPI card top-left আইকন (৪০-৪৮px) |
| **POP/Reseller layout** | `src/components/reseller/ResellerLayout.tsx` ও `ResellerDashboard.tsx` | Sidebar + quick action grid |
| **Client Portal sidebar** | `src/components/PortalLayout.tsx` | Desktop sidebar tile + drawer |
| **Client Portal Dashboard/Bills/Support** | `PortalDashboard.tsx`, `PortalBills.tsx`, `PortalSupport.tsx` | `IconGrid` quick actions |
| **Mobile bottom nav** | `PortalLayout` ও `ResellerLayout` bottom nav | ৫টা bottom item Icons8 দিয়ে |
| **Empty states / Section headers** | বিভিন্ন list page (Customers, Invoices, Tickets, OLT, Inventory) | Empty state-এ বড় Icons8 illustration |

#### Phase 3 — Preview + handoff
- `/dashboard/_icons` page upgrade — তিন tab: **Icons8 | Hishabee | Lucide**
- প্রতিটা আইকনের পাশে filename + "Copy name" button
- আপনি browse করে যেকোনোটা যেকোনো menu-তে assign করতে বললেই পরবর্তী sprint-এ map হবে

### Mapping confidence (filename দেখার পরে confirm হবে)
| Menu / Action | Icons8 candidate |
|---|---|
| ড্যাশবোর্ড / Home | dashboard, home |
| ক্রয় / Purchase | cart, shopping-bag |
| বিক্রয় / Sales | invoice, sale |
| ক্যাশবক্স / Accounting | wallet, money, cash |
| ইনভেন্টরি | box, warehouse |
| HR / Employee | user-group, employee |
| OLT / Network | router, wifi, network |
| টিকেট / Support | headphones, ticket |
| রিপোর্ট | bar-chart, report |
| SMS | message, sms |
| Settings | gear, settings |
| Notice | bell |
| Profile | user-circle |
| Bills | receipt |
| Ledger | book |

### যা বদলাবে না
- Database, RBAC, business logic, routing
- Layout structure (recently fixed PortalLayout consistency বহাল)
- Hishabee + Lucide pack বহাল থাকবে fallback হিসেবে — কিছু break হবে না
- Mobile/tablet/desktop responsive behavior

### Files

| File | Change |
|---|---|
| `src/assets/icons/icons8/*` | Zip extract + rename |
| `src/components/icons/Icons8Icon.tsx` | নতুন wrapper (Lottie support সহ) |
| `src/lib/iconResolver.ts` | নতুন central resolver |
| `src/components/sidebar/MenuIconTile.tsx` | Resolver ব্যবহার |
| `src/components/AppSidebar.tsx` | Map update |
| `src/components/PortalLayout.tsx` | Sidebar + bottom nav icons |
| `src/components/reseller/ResellerLayout.tsx` | একইভাবে |
| `src/pages/Dashboard.tsx` | KPI card icons |
| `src/pages/portal/PortalDashboard.tsx` + Bills + Support | IconGrid icons |
| `src/pages/reseller/ResellerDashboard.tsx` | IconGrid icons |
| `src/components/mobile/IconCard.tsx` | Resolver integration |
| `src/pages/dashboard/dev/IconPreview.tsx` | 3-tab preview upgrade |
| **মোট** | **~12-14 files + asset folder** |

### Lottie / animated handling
যদি zip-এ `.json` (Lottie) বা `.gif` থাকে:
- Sidebar/bottom nav-এ static PNG variant ব্যবহার (performance)
- Dashboard quick-action card hover/active state-এ animated variant — "interactive" feel
- `lottie-react` package add করা হবে (~25KB gz, lazy-loaded)

### Delivery flow
1. Phase 1 শেষ করে আপনাকে file count + sample preview দেখাবো
2. Phase 2 — confident match (১৫-২০টা) একসাথে সব panel-এ বসাবো
3. `/dashboard/_icons`-এ গিয়ে বাকিগুলো আপনি pick করবেন

Approve করলে শুরু করি।

