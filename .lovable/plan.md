

## Important Links — Dashboard-এর নিচে quick-access bookmarks

### দুটি কাজ একসাথে
1. **Build error fix** — PWA service worker 4.61 MB JS chunk reject করছে; cache size limit বাড়াতে হবে
2. **নতুন module** — Important Links (Admin + Employee/Operator only)

---

### ১) Build Error Fix
`vite.config.ts`-এ workbox config-এ এক line যোগ:
```ts
workbox: {
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB
  ...
}
```
এতে বড় JS bundle precache হবে এবং build pass করবে।

---

### ২) Important Links Module

#### Concept (sample image-এর মত)
- Dashboard page (`/dashboard`)-এর ঠিক নিচে নতুন section: **"Important Links"**
- Group/category-তে link গুলো organized (e.g. "Support & Billing", "Monitoring Tools", "POP OLT IP")
- প্রতিটি link card-এ: **Title + Icon/Logo image + URL** (click → new tab)
- শুধু `super_admin`, `admin`, `operator` (employee) দেখবে — অন্য কেউ না
- Admin/Operator → CRUD (add/edit/delete category & link, upload icon image)
- Operator (employee) → শুধু view (অথবা optional add — নিচে question দেখুন)

#### Database (নতুন tables)

**`important_link_categories`**
| column | type |
|---|---|
| id | uuid PK |
| name | text |
| icon | text (lucide icon name) |
| sort_order | int |
| created_by | uuid |
| created_at | timestamptz |

**`important_links`**
| column | type |
|---|---|
| id | uuid PK |
| category_id | uuid FK |
| title | text |
| url | text |
| icon_url | text (uploaded image in storage) |
| description | text nullable |
| sort_order | int |
| created_by | uuid |
| created_at | timestamptz |

**RLS**: only `super_admin`, `admin`, `operator` roles can `SELECT`. Only `super_admin`/`admin` can `INSERT/UPDATE/DELETE`.

**Storage bucket**: `important-link-icons` (public read, admin write)

#### UI Components (new files)

1. **`src/components/dashboard/ImportantLinksSection.tsx`**
   - Dashboard-এ embed করা section
   - Categories accordion-style (collapsible) — sample image-এর মত
   - প্রতিটি category-তে responsive grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7`
   - Card: small square (~120px) with icon image (centered) + title above
   - Hover: border highlight + shadow
   - Click → `window.open(url, '_blank', 'noopener')`
   - Admin দেখলে: top-right "+ Add Link" + each card-এ edit/delete on hover

2. **`src/components/dashboard/ImportantLinkCard.tsx`** — single card

3. **`src/components/dashboard/ImportantLinkDialog.tsx`** — add/edit modal (title, URL, category dropdown, icon image upload)

4. **`src/components/dashboard/ImportantLinkCategoryDialog.tsx`** — add/edit category (name + lucide icon picker)

5. **`src/pages/dashboard/ImportantLinksManage.tsx`** *(optional full-page manager)* — bulk reorder, drag-drop sort

#### Dashboard integration
- `src/pages/dashboard/Dashboard.tsx` (অথবা যেটা `/dashboard` route render করে) — existing widgets-এর নিচে `<ImportantLinksSection />` mount
- Visibility guard: `useAuth().hasRole('super_admin' || 'admin' || 'operator')` — false হলে section render হবে না

#### Sidebar (optional)
- "ড্যাশবোর্ড" group-এর under-এ একটা sub-link: **"গুরুত্বপূর্ণ লিংক"** → `/dashboard/important-links` (full-screen manage view)
- শুধু admin দেখবে

#### Default seed data (image থেকে নেওয়া)
Migration-এ কিছু sample category + link insert করব যাতে user সাথে সাথে কিছু দেখে:
- **Support & Billing**: Billing software, ONU Config, Mail Admin, FreePBX, BDCOM Balance
- **Monitoring Tools**: Log server, Ping, IPAM, Cacti, Uptime Kuma, Observium, Promox, etc.
- **POP OLT IP**: placeholder entries

User পরে edit/delete/add করতে পারবে।

---

### Files to create
- `src/components/dashboard/ImportantLinksSection.tsx`
- `src/components/dashboard/ImportantLinkCard.tsx`
- `src/components/dashboard/ImportantLinkDialog.tsx`
- `src/components/dashboard/ImportantLinkCategoryDialog.tsx`
- Migration: 2 tables + RLS + storage bucket + seed data

### Files to edit
- `vite.config.ts` — workbox `maximumFileSizeToCacheInBytes`
- `src/pages/dashboard/Dashboard.tsx` (or main dashboard file) — mount section
- `src/components/AppSidebar.tsx` — optional manage link

### ফলাফল
- Build error সমাধান
- Dashboard-এ একটা সুন্দর "Important Links" hub — Admin/Employee এক click-এ যেকোনো work tool-এ পৌঁছাবে
- Admin live add/edit/delete করতে পারবে, icon upload সহ
- Sample image-এর exact look-and-feel (category-grouped cards with icons)

