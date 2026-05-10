## লক্ষ্য

পুরো ERP ড্যাশবোর্ডে একটা consistent **Breadcrumb (লিংক হায়ারার্কি)** যোগ করা — যাতে ইউজার দেখতে পায় সে কোন গ্রুপ → কোন পেজে আছে, এবং এক ক্লিকে আগের লেভেল বা পূর্বের পেজে ফিরে যেতে পারে।

দেখতে এমন হবে:

```text
[← Back]   ড্যাশবোর্ড  /  All Clients  /  হোম ক্লায়েন্ট
```

প্রতিটা segment clickable — গ্রুপ ক্লিকে ওই গ্রুপের first item-এ যাবে, লাস্ট segment হলো current page (non-clickable)। Back বাটন `navigate(-1)` করবে।

ভাষা সিস্টেমের সাথে কাজ করবে (বাংলা/English) — `useLanguage()` থেকে।

---

## পরিকল্পনা

### 1. Single source of truth: route registry
নতুন ফাইল `src/lib/routeRegistry.ts` — এখানে এক জায়গায় থাকবে সব ড্যাশবোর্ড route-এর `{ path, title (bn), titleEn, group, groupEn }`। ডেটা আসবে `AppSidebar.tsx`-এর `menuGroups` থেকে copy/extract করে (একই titles যাতে sidebar আর breadcrumb মিলে যায়)।

পাশাপাশি কিছু dynamic/detail route যেগুলো sidebar-এ নেই (যেমন `/dashboard/clients/:id`, `/dashboard/billing/invoice/:id`) — এগুলোর জন্য pattern → label ম্যাপিং রাখব (React Router style `:param` সাপোর্ট সহ একটা ছোট matcher)।

### 2. Hook: `useBreadcrumbs()`
`src/hooks/useBreadcrumbs.ts` — current `pathname` থেকে registry lookup করে array return করবে:

```ts
[
  { label: "ড্যাশবোর্ড", href: "/dashboard" },
  { label: "All Clients", href: "/dashboard/clients/home" }, // group → first item
  { label: "হোম ক্লায়েন্ট", href: null }, // current page
]
```

কোনো route registry-তে না থাকলে path segments থেকে fallback লেবেল বানাবে।

### 3. Component: `<Breadcrumbs />`
`src/components/Breadcrumbs.tsx` — shadcn `breadcrumb.tsx` ব্যবহার করে render করবে:
- বাঁয়ে একটা ছোট **← Back** ghost button (`navigate(-1)`)
- তারপর `Home` icon → group → page chain
- Mobile-এ middle segments collapse হবে (BreadcrumbEllipsis), শুধু Home + current দেখাবে
- Sticky না, simple inline strip

### 4. Mount globally
`src/components/DashboardLayout.tsx`-এর `<main>` এর একদম উপরে `<Breadcrumbs />` বসানো হবে। Dashboard root (`/dashboard`) এ Back বাটন hide হবে, breadcrumb-ও minimal থাকবে।

কোনো individual page touch করতে হবে না — সব পেজে automatic আসবে।

### 5. (Optional polish)
- ESC কী চাপলে back navigate করা — accessibility nice-to-have
- TopBar-এর সাথে spacing adjust যাতে double padding না হয়

---

## টেকনিক্যাল ডিটেইলস

**Files to create**
- `src/lib/routeRegistry.ts` — route → label/group ম্যাপ + matcher
- `src/hooks/useBreadcrumbs.ts` — pathname → crumbs[] derive
- `src/components/Breadcrumbs.tsx` — UI

**Files to edit**
- `src/components/DashboardLayout.tsx` — `<Breadcrumbs />` mount
- (ঐচ্ছিক) `src/components/AppSidebar.tsx` — menuGroups কে `export` করা যাতে registry duplicate না হয়

**যা touch হবে না**
- ব্যাকএন্ড / DB / edge functions — কিছুই না
- পাবলিক সাইট, পোর্টাল, রিসেলার লেআউট — শুধু admin dashboard
- কোনো individual পেজ ফাইল

**Coverage**
সব `/dashboard/*` route automatically পাবে। Reseller (`/reseller/*`) আর portal (`/portal/*`) লেআউটে চাইলে পরে একই pattern apply করা যাবে — এই plan-এ admin dashboard scope।

---

## প্রশ্ন (approve করার আগে জানালে ভালো)

1. Back বাটন কি **ব্রাউজার history back** (`navigate(-1)`) চান, নাকি **parent group** এ যাওয়া (যেমন হোম ক্লায়েন্ট থেকে All Clients group)? ডিফল্টে browser back ধরে এগোচ্ছি।
2. Reseller portal (`/reseller/*`) আর Customer portal (`/portal/*`)-এও এখনই চান, নাকি শুধু admin dashboard?
