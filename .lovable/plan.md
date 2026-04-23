

## Hishabee SVG আইকন সেট integration

### লক্ষ্য
আপনার আপলোড করা `Dokan - Hishabee.zip`-এর ভিতরের রঙিন SVG আইকনগুলো admin panel-এর সব জায়গায় (sidebar, dashboard cards, mobile shells) যেখানে যেটা মানানসই — সেখানে ব্যবহার করা। বাকি আইকন আপনি পরে নিজে map করবেন।

### Steps (default mode-এ execute হবে)

**১. Zip extract + inventory**
- `user-uploads://Dokan_-_Hishabee.zip` → `src/assets/icons/hishabee/` ফোল্ডারে unzip
- প্রতিটা SVG-র filename list করব (zip-এ `download (1).svg`, `download (2).svg` জাতীয় generic নাম থাকলে — কিছু খুলে preview করে semantic নাম দেব, যেমন `cart.svg`, `wallet.svg`, `report.svg`)
- Total কতটা আইকন আছে তা list করে আপনাকে দেখাবো

**২. Reusable `<HishabeeIcon>` component**
`src/components/icons/HishabeeIcon.tsx`:
```tsx
<HishabeeIcon name="cart" size={24} />
```
- ভিতরে Vite-র `import.meta.glob` দিয়ে সব SVG eager-load — tree-shake ফ্রেন্ডলি
- Props: `name`, `size`, `className`
- Fallback: name না থাকলে lucide icon দেখাবে (graceful)

**৩. Sidebar tile-এ Hishabee আইকন (যেখানে match আছে)**
`MenuIconTile` upgrade করে `customIcon?: string` prop যোগ — Hishabee নাম পেলে লুসাইডের বদলে SVG render করবে। বাকি item-এ আগের লুসাইড + tint বহাল।

Mapping যা confident match (filename পাওয়ার পর confirm):
| Menu | Hishabee icon (probable) |
|---|---|
| ড্যাশবোর্ড | dashboard / home |
| ক্রয় (Purchase) | cart / purchase |
| বিক্রয় (Sales) | sales / invoice |
| ক্যাশবক্স / অ্যাকাউন্টিং | wallet / cash |
| ইনভেন্টরি | box / inventory |
| HR ও পেরোল | people / employee |
| সাপোর্ট ও টিকেটিং | headphone / support |
| রিপোর্ট | chart / report |
| SMS সার্ভিস | message |
| সেটিংস | gear |
| কাস্টমার | user |
| ব্যান্ডউইথ ক্রয় | network / wifi |

**৪. Dashboard quick-action কার্ডে আইকন**
- `src/pages/Dashboard.tsx`-এর top KPI / quick-link card-গুলোতে relevant Hishabee আইকন ৪০-৪৮px size-এ
- শুধু confident match — বাকি unchanged

**৫. Mobile shells (Portal + POP Admin)**
- `IconCard`-এ already lucide ব্যবহার হয় — `customSvg?: string` prop যোগ
- Client Portal dashboard ও POP Admin dashboard-এর IconGrid-এ যেগুলো match হয় (বিল, পেমেন্ট, টিকেট, প্রোফাইল, রিপোর্ট) Hishabee আইকন বসানো হবে

**৬. Unmatched icon গুলোর preview page (আপনার জন্য)**
`src/pages/dashboard/dev/IconPreview.tsx` — শুধু dev-এ (route `/dashboard/_icons`):
- সব Hishabee SVG একটা grid-এ filename + preview সহ দেখাবে
- আপনি browse করে কোনটা কোথায় বসাতে চান বলতে পারবেন
- পরে easy unmount

### যা বদলাবে না
- Database, business logic, RBAC, routing
- লুসাইড আইকন পুরোপুরি বাদ যাবে না — যেখানে Hishabee match নেই, লুসাইড + আগের tint থাকবে
- Mobile bottom nav (already polished)

### Files

| File | Change |
|---|---|
| `src/assets/icons/hishabee/*.svg` | Zip extract করে এখানে copy |
| `src/components/icons/HishabeeIcon.tsx` | নতুন reusable wrapper |
| `src/components/sidebar/MenuIconTile.tsx` | `customIcon` prop |
| `src/components/AppSidebar.tsx` | Confident match items-এ icon name যোগ |
| `src/components/mobile/IconCard.tsx` | `customSvg` prop |
| `src/pages/portal/PortalDashboard.tsx` | IconGrid-এ Hishabee icon |
| `src/pages/reseller/ResellerDashboard.tsx` | একইভাবে |
| `src/pages/Dashboard.tsx` | Quick-action card icon |
| `src/pages/dashboard/dev/IconPreview.tsx` | নতুন preview page |
| **মোট** | **~9 file + asset folder** |

### Delivery flow
1. প্রথমে zip extract → আমি filename list ও preview page বানাবো
2. যেগুলো confident match (১০-১৫টা) সেগুলো একসাথে sidebar/dashboard-এ বসাবো
3. আপনি `/dashboard/_icons` page-এ গিয়ে বাকিগুলো দেখে বলবেন কোনটা কোথায় — পরের sprint-এ map করব

Approve করলে শুরু করি।

